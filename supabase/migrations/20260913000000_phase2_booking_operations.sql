-- ============================================================
-- Phase 2: Admin Booking Operations Rebuild
-- ============================================================

-- ============================================================
-- 1. Extend session_requests with booking/payment separation
-- ============================================================
ALTER TABLE public.session_requests
  ADD COLUMN IF NOT EXISTS booking_status text NOT NULL DEFAULT 'awaiting_mentor',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS payment_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_gateway text,
  ADD COLUMN IF NOT EXISTS payment_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_id uuid;

-- Constrain booking_status
ALTER TABLE public.session_requests
  DROP CONSTRAINT IF EXISTS session_requests_booking_status_check;

ALTER TABLE public.session_requests
  ADD CONSTRAINT session_requests_booking_status_check
  CHECK (booking_status IN (
    'awaiting_mentor',
    'mentor_assigned',
    'mentor_accepted',
    'mentor_declined',
    'mentor_expired',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
  ));

-- Constrain payment_status
ALTER TABLE public.session_requests
  DROP CONSTRAINT IF EXISTS session_requests_payment_status_check;

ALTER TABLE public.session_requests
  ADD CONSTRAINT session_requests_payment_status_check
  CHECK (payment_status IN (
    'pending',
    'completed',
    'failed',
    'cancelled',
    'refunded'
  ));

-- ============================================================
-- 2. Create mentor_session_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mentor_session_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.session_requests(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  session_time time NOT NULL,
  duration_mins integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'pending',
  response_deadline timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  responded_at timestamptz,
  decline_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mentor_session_requests TO authenticated;
GRANT ALL ON public.mentor_session_requests TO service_role;

ALTER TABLE public.mentor_session_requests ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "mentor_session_requests_admin_manage" ON public.mentor_session_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Mentors can read their own requests
CREATE POLICY "mentor_session_requests_mentor_read" ON public.mentor_session_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = mentor_id);

-- Mentors can update their own requests (accept/decline)
CREATE POLICY "mentor_session_requests_mentor_update" ON public.mentor_session_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = mentor_id)
  WITH CHECK (auth.uid() = mentor_id);

-- Service role full access
CREATE POLICY "mentor_session_requests_service_all" ON public.mentor_session_requests
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_mentor_session_requests_updated ON public.mentor_session_requests;
CREATE TRIGGER trg_mentor_session_requests_updated
  BEFORE UPDATE ON public.mentor_session_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mentor_session_requests_booking ON public.mentor_session_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_mentor_session_requests_mentor ON public.mentor_session_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_session_requests_status ON public.mentor_session_requests(status);
CREATE INDEX IF NOT EXISTS idx_mentor_session_requests_deadline ON public.mentor_session_requests(response_deadline);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_session_requests;

-- ============================================================
-- 3. Create booking_timeline table for audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.session_requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  actor_role text,
  action text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.booking_timeline TO authenticated;
GRANT ALL ON public.booking_timeline TO service_role;

ALTER TABLE public.booking_timeline ENABLE ROW LEVEL SECURITY;

-- Admins can read all
CREATE POLICY "booking_timeline_admin_read" ON public.booking_timeline
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Students can read their own booking timeline
CREATE POLICY "booking_timeline_student_read" ON public.booking_timeline
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.session_requests
      WHERE session_requests.id = booking_timeline.booking_id
      AND session_requests.student_id = auth.uid()
    )
  );

-- Mentors can read timeline for their assigned bookings
CREATE POLICY "booking_timeline_mentor_read" ON public.booking_timeline
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.session_requests
      WHERE session_requests.id = booking_timeline.booking_id
      AND session_requests.assigned_mentor = auth.uid()
    )
  );

-- Service role can insert
CREATE POLICY "booking_timeline_service_insert" ON public.booking_timeline
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_timeline_booking ON public.booking_timeline(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_timeline_created ON public.booking_timeline(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_timeline;

-- ============================================================
-- 4. Helper function to add timeline entry
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_booking_timeline_entry(
  p_booking_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_action text,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.booking_timeline (
    booking_id, actor_id, actor_role, action, description, metadata
  ) VALUES (
    p_booking_id, p_actor_id, p_actor_role, p_action, p_description, p_metadata
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Helper function to create mentor session request with auto-assign
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_mentor_session_request(
  p_booking_id uuid,
  p_mentor_id uuid,
  p_student_id uuid,
  p_session_date date,
  p_session_time time,
  p_duration_mins integer DEFAULT 30
)
RETURNS uuid AS $$
DECLARE
  v_request_id uuid;
  v_deadline timestamptz;
BEGIN
  v_deadline := now() + interval '15 minutes';

  INSERT INTO public.mentor_session_requests (
    booking_id, mentor_id, student_id, session_date, session_time, duration_mins, response_deadline
  ) VALUES (
    p_booking_id, p_mentor_id, p_student_id, p_session_date, p_session_time, p_duration_mins, v_deadline
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. Helper function to expire mentor requests and reassign
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_mentor_requests(p_booking_id uuid)
RETURNS void AS $$
DECLARE
  v_booking record;
  v_next_mentor uuid;
  v_new_request_id uuid;
BEGIN
  -- Get booking details
  SELECT * INTO v_booking FROM public.session_requests WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Mark all pending requests for this booking as expired
  UPDATE public.mentor_session_requests
  SET status = 'expired', updated_at = now()
  WHERE booking_id = p_booking_id AND status = 'pending';

  -- Add timeline entry
  PERFORM public.add_booking_timeline_entry(
    p_booking_id, NULL, 'system', 'mentor_requests_expired',
    'All pending mentor requests expired — initiating auto-reassignment',
    '{}'::jsonb
  );

  -- Find next eligible mentor (exclude previously contacted mentors)
  SELECT m.user_id INTO v_next_mentor
  FROM public.mentor_profiles m
  WHERE m.is_active = true
    AND m.user_id NOT IN (
      SELECT DISTINCT mentor_id FROM public.mentor_session_requests WHERE booking_id = p_booking_id
    )
    AND m.languages_taught @> ARRAY[COALESCE(v_booking.language, 'english')]
  LIMIT 1;

  -- If found, create new request
  IF v_next_mentor IS NOT NULL THEN
    v_new_request_id := public.create_mentor_session_request(
      p_booking_id,
      v_next_mentor,
      v_booking.student_id,
      (v_booking.scheduled_time)::date,
      (v_booking.scheduled_time)::time,
      v_booking.duration_mins
    );

    -- Update booking status
    UPDATE public.session_requests
    SET booking_status = 'mentor_assigned', assigned_mentor = v_next_mentor, updated_at = now()
    WHERE id = p_booking_id;

    -- Add timeline entry
    PERFORM public.add_booking_timeline_entry(
      p_booking_id, v_next_mentor, 'system', 'mentor_auto_assigned',
      'Auto-assigned to next eligible mentor after expiry',
      jsonb_build_object('request_id', v_new_request_id, 'mentor_id', v_next_mentor)
    );
  ELSE
    -- No eligible mentor found
    UPDATE public.session_requests
    SET booking_status = 'awaiting_mentor', assigned_mentor = NULL, updated_at = now()
    WHERE id = p_booking_id;

    -- Add timeline entry
    PERFORM public.add_booking_timeline_entry(
      p_booking_id, NULL, 'system', 'no_eligible_mentor',
      'No eligible mentor available for auto-reassignment',
      '{}'::jsonb
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Atomic mentor accept with concurrency safety
-- ============================================================
CREATE OR REPLACE FUNCTION public.mentor_accept_booking_atomic(
  p_request_id uuid,
  p_mentor_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_request record;
  v_booking record;
  v_existing_session uuid;
BEGIN
  -- Lock and fetch the mentor request
  SELECT * INTO v_request FROM public.mentor_session_requests
  WHERE id = p_request_id AND mentor_id = p_mentor_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already handled');
  END IF;

  -- Lock and fetch the booking
  SELECT * INTO v_booking FROM public.session_requests
  WHERE id = v_request.booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Check if booking is already confirmed by another mentor
  IF v_booking.booking_status = 'confirmed' OR v_booking.booking_status = 'in_progress' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session already assigned');
  END IF;

  -- Mark request accepted
  UPDATE public.mentor_session_requests
  SET status = 'accepted', responded_at = now(), updated_at = now()
  WHERE id = p_request_id;

  -- Mark all other pending requests for this booking as expired
  UPDATE public.mentor_session_requests
  SET status = 'expired', updated_at = now()
  WHERE booking_id = v_request.booking_id AND status = 'pending' AND id != p_request_id;

  -- Update booking
  UPDATE public.session_requests
  SET booking_status = 'confirmed', assigned_mentor = p_mentor_id, updated_at = now()
  WHERE id = v_request.booking_id;

  -- Add timeline entry
  PERFORM public.add_booking_timeline_entry(
    v_request.booking_id, p_mentor_id, 'mentor', 'mentor_accepted',
    'Mentor accepted the booking request',
    jsonb_build_object('request_id', p_request_id)
  );

  RETURN jsonb_build_object('success', true, 'booking_id', v_request.booking_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. Atomic mentor decline with auto-reassignment
-- ============================================================
CREATE OR REPLACE FUNCTION public.mentor_decline_booking_atomic(
  p_request_id uuid,
  p_mentor_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_request record;
  v_next_mentor uuid;
  v_new_request_id uuid;
BEGIN
  -- Lock and fetch the request
  SELECT * INTO v_request FROM public.mentor_session_requests
  WHERE id = p_request_id AND mentor_id = p_mentor_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already handled');
  END IF;

  -- Mark declined
  UPDATE public.mentor_session_requests
  SET status = 'declined', decline_reason = p_reason, responded_at = now(), updated_at = now()
  WHERE id = p_request_id;

  -- Add timeline entry
  PERFORM public.add_booking_timeline_entry(
    v_request.booking_id, p_mentor_id, 'mentor', 'mentor_declined',
    COALESCE(p_reason, 'Mentor declined the request'),
    jsonb_build_object('request_id', p_request_id, 'reason', p_reason)
  );

  -- Find next eligible mentor
  SELECT m.user_id INTO v_next_mentor
  FROM public.mentor_profiles m
  WHERE m.is_active = true
    AND m.user_id NOT IN (
      SELECT DISTINCT mentor_id FROM public.mentor_session_requests WHERE booking_id = v_request.booking_id
    )
    AND m.languages_taught @> ARRAY[COALESCE(
      (SELECT language FROM public.session_requests WHERE id = v_request.booking_id), 'english'
    )]
  LIMIT 1;

  IF v_next_mentor IS NOT NULL THEN
    v_new_request_id := public.create_mentor_session_request(
      v_request.booking_id,
      v_next_mentor,
      v_request.student_id,
      v_request.session_date,
      v_request.session_time,
      v_request.duration_mins
    );

    UPDATE public.session_requests
    SET booking_status = 'mentor_assigned', assigned_mentor = v_next_mentor, updated_at = now()
    WHERE id = v_request.booking_id;

    PERFORM public.add_booking_timeline_entry(
      v_request.booking_id, v_next_mentor, 'system', 'mentor_auto_assigned',
      'Auto-assigned to next eligible mentor after decline',
      jsonb_build_object('request_id', v_new_request_id, 'mentor_id', v_next_mentor)
    );
  ELSE
    UPDATE public.session_requests
    SET booking_status = 'awaiting_mentor', assigned_mentor = NULL, updated_at = now()
    WHERE id = v_request.booking_id;

    PERFORM public.add_booking_timeline_entry(
      v_request.booking_id, NULL, 'system', 'no_eligible_mentor',
      'No eligible mentor available after decline',
      '{}'::jsonb
    );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. Cron-like cleanup for expired mentor requests
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_mentor_requests()
RETURNS void AS $$
DECLARE
  v_request record;
BEGIN
  FOR v_request IN
    SELECT * FROM public.mentor_session_requests
    WHERE status = 'pending' AND response_deadline < now()
    LIMIT 100
  LOOP
    PERFORM public.expire_mentor_requests(v_request.booking_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. Add session_timeline compatibility
-- ============================================================
ALTER TABLE public.session_timeline
  DROP CONSTRAINT IF EXISTS session_timeline_event_type_check;

ALTER TABLE public.session_timeline
  ADD CONSTRAINT session_timeline_event_type_check
  CHECK (event_type IN (
    'booking_created',
    'mentor_assigned',
    'mentor_request_sent',
    'mentor_request_expired',
    'mentor_declined',
    'mentor_accepted',
    'admin_claimed',
    'booking_confirmed',
    'booking_cancelled',
    'payment_received',
    'payment_refunded',
    'session_started',
    'session_ended',
    'note_added',
    'homework_added'
  ));