-- ============================================================
-- Subscription Slot Management & Real-time Booking Engine
-- ============================================================

-- ============================================================
-- 1. Create booking_capacity table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_time timestamptz NOT NULL,
  duration_mins integer NOT NULL,
  total_capacity integer NOT NULL DEFAULT 0,
  booked_count integer NOT NULL DEFAULT 0,
  available_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scheduled_time, duration_mins)
);

GRANT SELECT, INSERT, UPDATE ON public.booking_capacity TO authenticated;
GRANT ALL ON public.booking_capacity TO service_role;

ALTER TABLE public.booking_capacity ENABLE ROW LEVEL SECURITY;

-- Anyone can read capacity
CREATE POLICY "Booking capacity read" ON public.booking_capacity
  FOR SELECT TO authenticated
  USING (true);

-- Service role can manage capacity
CREATE POLICY "Booking capacity service manage" ON public.booking_capacity
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. Create slot_restoration_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.slot_restoration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  subscription_id uuid REFERENCES public.student_subscriptions(id) NOT NULL,
  booking_id uuid REFERENCES public.sessions(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.slot_restoration_requests TO authenticated;
GRANT ALL ON public.slot_restoration_requests TO service_role;

ALTER TABLE public.slot_restoration_requests ENABLE ROW LEVEL SECURITY;

-- Students can create restoration requests
CREATE POLICY "Slot restoration student create" ON public.slot_restoration_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Students can read their own requests
CREATE POLICY "Slot restoration student read" ON public.slot_restoration_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage all requests
CREATE POLICY "Slot restoration admin manage" ON public.slot_restoration_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. Create slot_restoration_audit table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.slot_restoration_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restoration_request_id uuid REFERENCES public.slot_restoration_requests(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  subscription_id uuid REFERENCES public.student_subscriptions(id) NOT NULL,
  slots_restored integer NOT NULL,
  reason text NOT NULL,
  performed_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.slot_restoration_audit TO authenticated;
GRANT ALL ON public.slot_restoration_audit TO service_role;

ALTER TABLE public.slot_restoration_audit ENABLE ROW LEVEL SECURITY;

-- Students can read their own audit records
CREATE POLICY "Slot restoration audit student read" ON public.slot_restoration_audit
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage audit records
CREATE POLICY "Slot restoration audit admin manage" ON public.slot_restoration_audit
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. Add trigger for booking_capacity updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_booking_capacity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_capacity_timestamp
  BEFORE UPDATE ON public.booking_capacity
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_capacity_timestamp();

-- ============================================================
-- 5. Create function to initialize booking capacity
-- ============================================================
CREATE OR REPLACE FUNCTION initialize_booking_capacity(
  p_scheduled_time timestamptz,
  p_duration_mins integer,
  p_total_capacity integer
)
RETURNS public.booking_capacity AS $$
DECLARE
  v_capacity public.booking_capacity;
BEGIN
  INSERT INTO public.booking_capacity (
    scheduled_time,
    duration_mins,
    total_capacity,
    booked_count,
    available_count
  ) VALUES (
    p_scheduled_time,
    p_duration_mins,
    p_total_capacity,
    0,
    p_total_capacity
  )
  ON CONFLICT (scheduled_time, duration_mins) DO UPDATE
  SET total_capacity = EXCLUDED.total_capacity,
      available_count = EXCLUDED.total_capacity - booking_capacity.booked_count
  RETURNING * INTO v_capacity;
  
  RETURN v_capacity;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. Create function to book a slot
-- ============================================================
CREATE OR REPLACE FUNCTION book_booking_slot(
  p_scheduled_time timestamptz,
  p_duration_mins integer
)
RETURNS boolean AS $$
DECLARE
  v_capacity public.booking_capacity;
BEGIN
  -- Try to update and check if slot is available
  UPDATE public.booking_capacity
  SET booked_count = booked_count + 1,
      available_count = total_capacity - (booked_count + 1)
  WHERE scheduled_time = p_scheduled_time
    AND duration_mins = p_duration_mins
    AND available_count > 0
  RETURNING * INTO v_capacity;

  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Create function to release a slot
-- ============================================================
CREATE OR REPLACE FUNCTION release_booking_slot(
  p_scheduled_time timestamptz,
  p_duration_mins integer
)
RETURNS boolean AS $$
DECLARE
  v_capacity public.booking_capacity;
BEGIN
  UPDATE public.booking_capacity
  SET booked_count = GREATEST(booked_count - 1, 0),
      available_count = LEAST(total_capacity - (GREATEST(booked_count - 1, 0)), total_capacity)
  WHERE scheduled_time = p_scheduled_time
    AND duration_mins = p_duration_mins
  RETURNING * INTO v_capacity;

  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. Create function to get available capacity
-- ============================================================
CREATE OR REPLACE FUNCTION get_available_capacity(
  p_scheduled_time timestamptz,
  p_duration_mins integer
)
RETURNS integer AS $$
DECLARE
  v_available integer;
BEGIN
  SELECT available_count INTO v_available
  FROM public.booking_capacity
  WHERE scheduled_time = p_scheduled_time
    AND duration_mins = p_duration_mins;

  IF v_available IS NULL THEN
    RETURN 0;
  ELSE
    RETURN v_available;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. Create indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_booking_capacity_time
  ON public.booking_capacity (scheduled_time);
CREATE INDEX IF NOT EXISTS idx_booking_capacity_available
  ON public.booking_capacity (available_count);
CREATE INDEX IF NOT EXISTS idx_slot_restoration_user
  ON public.slot_restoration_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_slot_restoration_status
  ON public.slot_restoration_requests (status);
CREATE INDEX IF NOT EXISTS idx_slot_restoration_audit_user
  ON public.slot_restoration_audit (user_id);

-- ============================================================
-- 10. Enable Realtime for booking_capacity
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_capacity;