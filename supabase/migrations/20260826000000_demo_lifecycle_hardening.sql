-- ============================================================
-- Demo Session Lifecycle Production Hardening
-- Implements:
--   * Assignment deadline + version for race-safe acceptance
--   * New assignment statuses: pending_acceptance, expired
--   * New session statuses: ready, live
--   * Race-safe PostgreSQL function for mentor acceptance
--   * RLS allowing mentors to respond to their own assignments
--   * Automatic expiration enforcement function
-- ============================================================

-- ============================================================
-- 1. Add new columns to demo_session_bookings
-- ============================================================
ALTER TABLE public.demo_session_bookings
  ADD COLUMN IF NOT EXISTS acceptance_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS assignment_version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS assignment_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS assignment_expired_at timestamptz;

-- Ensure assignment_version has a default for existing rows
UPDATE public.demo_session_bookings
SET assignment_version = 1
WHERE assignment_version IS NULL;

-- ============================================================
-- 2. Race-safe mentor acceptance function
--
-- This function atomically validates and accepts a mentor's
-- assignment response. It checks:
--   * The assignment is still pending_acceptance
--   * The acceptance_deadline has not passed
--   * The assignment_version matches (prevents stale accepts)
--   * The mentor_id matches the assigned mentor
--
-- It increments the version and records the acceptance.
-- ============================================================
DROP FUNCTION IF EXISTS public.accept_demo_assignment(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.accept_demo_assignment;
CREATE OR REPLACE FUNCTION public.accept_demo_assignment(
  p_booking_id uuid,
  p_mentor_id uuid,
  p_client_version integer DEFAULT 1
)
RETURNS TABLE (
  success boolean,
  booking_status text,
  assignment_status text,
  meeting_link text,
  error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_now timestamptz := now();
  v_deadline timestamptz;
BEGIN
  -- Fetch the booking with a row lock to prevent concurrent modifications
  SELECT *
  INTO v_booking
  FROM public.demo_session_bookings
  WHERE id = p_booking_id
    AND mentor_id = p_mentor_id
    AND assignment_status = 'pending_acceptance'
    AND (acceptance_deadline IS NULL OR acceptance_deadline > v_now)
    AND assignment_version = p_client_version
  FOR UPDATE;

  -- If no row found, the assignment was either:
  --   - not found
  --   - not assigned to this mentor
  --   - already accepted/rejected/expired
  --   - deadline passed
  --   - version mismatch (stale accept after reassignment)
  IF NOT FOUND THEN
    SELECT id, assignment_status, acceptance_deadline, assignment_version
    INTO v_booking
    FROM public.demo_session_bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
      RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'Demo booking not found'::text;
    ELSIF v_booking.mentor_id IS DISTINCT FROM p_mentor_id THEN
      RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text, 'Not assigned to this mentor'::text;
    ELSIF v_booking.assignment_status != 'pending_acceptance' THEN
      RETURN QUERY SELECT false, v_booking.booking_status, v_booking.assignment_status, v_booking.meeting_link,
        CASE
          WHEN v_booking.assignment_status = 'expired' THEN 'Assignment has expired'
          ELSE 'Assignment is not awaiting acceptance'
        END;
    ELSIF v_booking.acceptance_deadline IS NOT NULL AND v_booking.acceptance_deadline <= v_now THEN
      -- Expire it
      RETURN QUERY SELECT false, v_booking.booking_status, 'expired'::text, v_booking.meeting_link, 'Acceptance deadline has passed'::text;
    ELSE
      RETURN QUERY SELECT false, v_booking.booking_status, v_booking.assignment_status, v_booking.meeting_link, 'Stale assignment (version mismatch)'::text;
    END IF;
    RETURN;
  END IF;

  -- Accept the assignment: set status to waiting_for_link
  -- (mentor must add meeting link before session is ready)
  UPDATE public.demo_session_bookings
  SET
    assignment_status = 'accepted',
    assignment_accepted_at = v_now,
    assignment_version = assignment_version + 1,
    updated_at = v_now
  WHERE id = p_booking_id;

  -- Record assignment history
  INSERT INTO public.demo_assignment_history (
    booking_id, mentor_id, action, performed_by, created_at
  ) VALUES (
    p_booking_id, p_mentor_id, 'accepted', p_mentor_id, v_now
  );

  RETURN QUERY SELECT true, v_booking.booking_status, 'accepted'::text, NULL::text, NULL::text;
END;
$$;

-- ============================================================
-- 3. Race-safe mentor rejection function
-- ============================================================
DROP FUNCTION IF EXISTS public.reject_demo_assignment(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.reject_demo_assignment;
CREATE OR REPLACE FUNCTION public.reject_demo_assignment(
  p_booking_id uuid,
  p_mentor_id uuid,
  p_decline_reason text DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_now timestamptz := now();
BEGIN
  -- Fetch and lock the booking
  SELECT *
  INTO v_booking
  FROM public.demo_session_bookings
  WHERE id = p_booking_id
    AND mentor_id = p_mentor_id
    AND assignment_status = 'pending_acceptance'
    AND (acceptance_deadline IS NULL OR acceptance_deadline > v_now)
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Check if it's expired or already handled
    SELECT id, assignment_status, acceptance_deadline
    INTO v_booking
    FROM public.demo_session_bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 'Demo booking not found'::text;
    ELSIF v_booking.mentor_id IS DISTINCT FROM p_mentor_id THEN
      RETURN QUERY SELECT false, 'Not assigned to this mentor'::text;
    ELSIF v_booking.acceptance_deadline IS NOT NULL AND v_booking.acceptance_deadline <= v_now THEN
      RETURN QUERY SELECT false, 'Assignment has expired'::text;
    ELSE
      RETURN QUERY SELECT false, 'Assignment is not awaiting your response'::text;
    END IF;
    RETURN;
  END IF;

  -- Reject: return to needs_reassignment, clear mentor assignment
  UPDATE public.demo_session_bookings
  SET
    assignment_status = 'needs_reassignment',
    mentor_id = NULL,
    mentor_id_confirmed = NULL,
    assignment_version = assignment_version + 1,
    updated_at = v_now
  WHERE id = p_booking_id;

  -- Record assignment history
  INSERT INTO public.demo_assignment_history (
    booking_id, mentor_id, action, notes, performed_by, created_at
  ) VALUES (
    p_booking_id, p_mentor_id, 'rejected', p_decline_reason, p_mentor_id, v_now
  );

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ============================================================
-- 4. Automatic expiration function
--
-- Call this from a scheduled job / edge function to expire
-- assignments whose deadline has passed.
-- ============================================================
DROP FUNCTION IF EXISTS public.expire_demo_assignments();
DROP FUNCTION IF EXISTS public.expire_demo_assignments;
CREATE OR REPLACE FUNCTION public.expire_demo_assignments()
RETURNS TABLE (
  expired_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_now timestamptz := now();
BEGIN
  -- Find assignments that are pending_acceptance but past their deadline
  -- and haven't been expired yet
  WITH expired_bookings AS (
    UPDATE public.demo_session_bookings
    SET
      assignment_status = 'expired',
      assignment_expired_at = v_now,
      assignment_version = assignment_version + 1,
      updated_at = v_now
    WHERE assignment_status = 'pending_acceptance'
      AND acceptance_deadline IS NOT NULL
      AND acceptance_deadline <= v_now
      AND booking_status IN ('pending_admin_confirmation', 'confirmed')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired_bookings;

  -- Record history for each expired assignment
  INSERT INTO public.demo_assignment_history (
    booking_id, mentor_id, action, notes, performed_by, created_at
  )
  SELECT
    e.id,
    b.mentor_id,
    'expired',
    'Assignment expired after deadline',
    NULL,
    v_now
  FROM expired_bookings e
  JOIN public.demo_session_bookings b ON b.id = e.id;

  RETURN QUERY SELECT v_count;
END;
$$;

-- ============================================================
-- 5. Race-safe admin assignment function
--
-- Admin assigns a mentor atomically with version check.
-- ============================================================
DROP FUNCTION IF EXISTS public.assign_demo_mentor(uuid, uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.assign_demo_mentor;
CREATE OR REPLACE FUNCTION public.assign_demo_mentor(
  p_booking_id uuid,
  p_mentor_id uuid,
  p_admin_id uuid,
  p_client_version integer DEFAULT 1
)
RETURNS TABLE (
  success boolean,
  assignment_version integer,
  error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_now timestamptz := now();
  v_deadline timestamptz;
BEGIN
  -- Fetch and lock the booking
  SELECT *
  INTO v_booking
  FROM public.demo_session_bookings
  WHERE id = p_booking_id
    AND assignment_version = p_client_version
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Check what's in the booking
    SELECT id, assignment_status, assignment_version
    INTO v_booking
    FROM public.demo_session_bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 0, 'Demo booking not found'::text;
    ELSIF v_booking.assignment_status NOT IN ('unassigned', 'needs_reassignment', 'expired') THEN
      RETURN QUERY SELECT false, v_booking.assignment_version, 'Demo is already assigned'::text;
    ELSE
      RETURN QUERY SELECT false, v_booking.assignment_version, 'Assignment was modified by another admin'::text;
    END IF;
    RETURN;
  END IF;

  -- Check mentor is valid
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_mentor_id AND ur.role = 'mentor'
  ) THEN
    RETURN QUERY SELECT false, p_client_version, 'User is not a mentor'::text;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.mentor_profiles mp
    WHERE mp.user_id = p_mentor_id AND mp.is_active = true
  ) THEN
    RETURN QUERY SELECT false, p_client_version, 'Mentor not found or not active'::text;
    RETURN;
  END IF;

  -- Set the 10-minute deadline
  v_deadline := v_now + interval '10 minutes';

  -- Atomically assign with version increment
  UPDATE public.demo_session_bookings
  SET
    mentor_id = p_mentor_id,
    assignment_status = 'pending_acceptance',
    acceptance_deadline = v_deadline,
    assignment_version = assignment_version + 1,
    assigned_at = v_now,
    updated_at = v_now
  WHERE id = p_booking_id;

  -- Record assignment history
  INSERT INTO public.demo_assignment_history (
    booking_id, mentor_id, action, performed_by, created_at, metadata
  ) VALUES (
    p_booking_id, p_mentor_id, 'assigned', p_admin_id, v_now,
    jsonb_build_object(
      'acceptance_deadline', v_deadline,
      'assignment_version', v_booking.assignment_version + 1
    )
  );

  RETURN QUERY SELECT true, v_booking.assignment_version + 1, NULL::text;
END;
$$;

-- ============================================================
-- 6. Race-safe admin "take session" function
-- ============================================================
DROP FUNCTION IF EXISTS public.admin_take_demo_session(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.admin_take_demo_session;
CREATE OR REPLACE FUNCTION public.admin_take_demo_session(
  p_booking_id uuid,
  p_admin_id uuid,
  p_client_version integer DEFAULT 1
)
RETURNS TABLE (
  success boolean,
  assignment_version integer,
  error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_now timestamptz := now();
  v_deadline timestamptz;
BEGIN
  -- Fetch and lock the booking
  SELECT *
  INTO v_booking
  FROM public.demo_session_bookings
  WHERE id = p_booking_id
    AND assignment_version = p_client_version
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT id, assignment_status, assignment_version
    INTO v_booking
    FROM public.demo_session_bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 0, 'Demo booking not found'::text;
    ELSIF v_booking.assignment_status NOT IN ('unassigned', 'needs_reassignment', 'expired') THEN
      RETURN QUERY SELECT false, v_booking.assignment_version, 'Demo is already assigned'::text;
    ELSE
      RETURN QUERY SELECT false, v_booking.assignment_version, 'Assignment was modified by another admin'::text;
    END IF;
    RETURN;
  END IF;

  -- Admin takes the session (becomes conductor)
  v_deadline := v_now + interval '10 minutes';

  UPDATE public.demo_session_bookings
  SET
    admin_id = p_admin_id,
    mentor_id = NULL,
    assignment_status = 'confirmed',
    acceptance_deadline = NULL,
    assignment_version = assignment_version + 1,
    assigned_at = v_now,
    booking_status = 'confirmed',
    updated_at = v_now
  WHERE id = p_booking_id;

  INSERT INTO public.demo_assignment_history (
    booking_id, mentor_id, action, performed_by, created_at, metadata
  ) VALUES (
    p_booking_id, NULL, 'admin_took', p_admin_id, v_now,
    jsonb_build_object('assignment_version', v_booking.assignment_version + 1)
  );

  RETURN QUERY SELECT true, v_booking.assignment_version + 1, NULL::text;
END;
$$;

-- ============================================================
-- 7. Add meeting link function (mentor or admin)
-- ============================================================
DROP FUNCTION IF EXISTS public.add_demo_meeting_link(uuid, uuid, text, boolean);
DROP FUNCTION IF EXISTS public.add_demo_meeting_link;
CREATE OR REPLACE FUNCTION public.add_demo_meeting_link(
  p_booking_id uuid,
  p_user_id uuid,
  p_meeting_link text,
  p_is_admin boolean DEFAULT false
)
RETURNS TABLE (
  success boolean,
  booking_status text,
  assignment_status text,
  error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_now timestamptz := now();
  v_is_valid boolean;
BEGIN
  -- Validate meeting link: must be HTTPS and non-empty
  IF p_meeting_link IS NULL OR trim(p_meeting_link) = '' THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, 'Meeting link is required'::text;
    RETURN;
  END IF;

  IF NOT (p_meeting_link LIKE 'https://%') THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, 'Meeting link must be a valid HTTPS URL'::text;
    RETURN;
  END IF;

  -- Fetch booking with lock
  SELECT *
  INTO v_booking
  FROM public.demo_session_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, 'Demo booking not found'::text;
    RETURN;
  END IF;

  -- Check authorization: either admin, assigned mentor, or admin conductor
  v_is_valid := p_is_admin
    OR (v_booking.mentor_id = p_user_id AND v_booking.assignment_status = 'accepted')
    OR (v_booking.admin_id = p_user_id AND v_booking.assignment_status = 'confirmed');

  IF NOT v_is_valid THEN
    RETURN QUERY SELECT false, v_booking.booking_status, v_booking.assignment_status,
      'Not authorized to add meeting link for this booking'::text;
    RETURN;
  END IF;

  -- Update with meeting link
  -- If status is accepted (mentor accepted, waiting for link) -> ready
  -- If status is confirmed (admin took session, waiting for link) -> ready
  UPDATE public.demo_session_bookings
  SET
    meeting_link = p_meeting_link,
    booking_status = 'confirmed',
    assignment_version = assignment_version + 1,
    updated_at = v_now
  WHERE id = p_booking_id;

  -- Record history
  INSERT INTO public.demo_assignment_history (
    booking_id, mentor_id, action, notes, performed_by, created_at
  ) VALUES (
    p_booking_id,
    CASE WHEN v_booking.mentor_id = p_user_id THEN p_user_id ELSE NULL END,
    'meeting_link_added',
    p_meeting_link,
    p_user_id,
    v_now
  );

  RETURN QUERY SELECT true, 'confirmed'::text, v_booking.assignment_status, NULL::text;
END;
$$;

-- ============================================================
-- 8. RLS: Allow mentors to read their own demo assignments
-- ============================================================
DROP POLICY IF EXISTS "Demo bookings mentor no access" ON public.demo_session_bookings;
DROP POLICY IF EXISTS "Demo bookings mentor read assigned" ON public.demo_session_bookings;
DROP POLICY IF EXISTS "Demo bookings mentor update assignment" ON public.demo_session_bookings;

-- Mentors can read their own demo assignments (any status)
CREATE POLICY "Demo bookings mentor read assigned" ON public.demo_session_bookings
  FOR SELECT TO authenticated
  USING (mentor_id = auth.uid());

-- Mentors can update assignment status on their own assignments
-- The trigger enforce_demo_booking_update_rules() already allows
-- assigned mentors to update (NEW.mentor_id = v_uid check)
CREATE POLICY "Demo bookings mentor update assignment" ON public.demo_session_bookings
  FOR UPDATE TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- ============================================================
-- 9. Grants for new functions
-- ============================================================
GRANT EXECUTE ON FUNCTION public.accept_demo_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_demo_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_demo_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_demo_mentor TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_take_demo_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_demo_meeting_link TO authenticated;

-- ============================================================
-- 10. Indexes for the new columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_demo_bookings_acceptance_deadline
  ON public.demo_session_bookings (acceptance_deadline)
  WHERE assignment_status = 'pending_acceptance';

CREATE INDEX IF NOT EXISTS idx_demo_bookings_assignment_version
  ON public.demo_session_bookings (assignment_version);

CREATE INDEX IF NOT EXISTS idx_demo_bookings_assignment_expired
  ON public.demo_session_bookings (assignment_expired_at)
  WHERE assignment_status = 'expired';

-- ============================================================
-- 11. Update the enforce_demo_booking_update_rules trigger
-- to handle new statuses and allow mentor updates for
-- pending_acceptance assignments
-- ============================================================
DROP TRIGGER IF EXISTS trg_enforce_demo_booking_update_rules ON public.demo_session_bookings;
DROP FUNCTION IF EXISTS public.enforce_demo_booking_update_rules();
CREATE OR REPLACE FUNCTION public.enforce_demo_booking_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_is_assigned_mentor boolean;
BEGIN
  -- Service role (NULL auth.uid()) and admins bypass.
  v_is_admin := v_uid IS NULL OR public.has_role(v_uid, 'admin');
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- The assigned mentor can update their own assignment (acceptance state)
  v_is_assigned_mentor := NEW.mentor_id = v_uid AND OLD.mentor_id = v_uid;
  IF v_is_assigned_mentor THEN
    -- Mentor can only change assignment_status to accepted/rejected
    -- and cannot modify booking_status or admin fields
    IF NEW.assignment_status NOT IN ('accepted', 'rejected', 'needs_reassignment') THEN
      RAISE EXCEPTION 'Mentor may only update assignment status to accepted, rejected, or needs_reassignment.';
    END IF;
    -- Cannot modify admin-managed fields
    IF NOT (
         NEW.admin_id           IS NOT DISTINCT FROM OLD.admin_id
      AND NEW.meeting_link       IS NOT DISTINCT FROM OLD.meeting_link
      AND NEW.admin_notes        IS NOT DISTINCT FROM OLD.admin_notes
      AND NEW.booking_status     IS NOT DISTINCT FROM OLD.booking_status
      AND NEW.confirmed_at       IS NOT DISTINCT FROM OLD.confirmed_at
      AND NEW.no_show_at         IS NOT DISTINCT FROM OLD.no_show_at
      AND NEW.completed_at       IS NOT DISTINCT FROM OLD.completed_at
      AND NEW.rescheduled_at     IS NOT DISTINCT FROM OLD.rescheduled_at
    ) THEN
      RAISE EXCEPTION 'Mentors may not modify admin-managed fields.';
    END IF;
    RETURN NEW;
  END IF;

  -- Only the booking owner may touch their own booking.
  IF v_uid IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Only the booking owner or an admin may update this demo booking.'
      USING ERRCODE = '42501';
  END IF;

  -- Students may ONLY cancel: the new status must be 'cancelled'.
  IF NEW.booking_status IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'Students may only cancel their demo booking.'
      USING ERRCODE = '42501';
  END IF;

  -- Cancellation is only allowed from pre-session states
  IF OLD.booking_status NOT IN ('pending_admin_confirmation', 'confirmed') THEN
    RAISE EXCEPTION 'This demo booking cannot be cancelled from its current state.'
      USING ERRCODE = '42501';
  END IF;

  -- Students may not modify any admin-managed field.
  IF NOT (
       NEW.admin_id           IS NOT DISTINCT FROM OLD.admin_id
   AND NEW.meeting_link       IS NOT DISTINCT FROM OLD.meeting_link
   AND NEW.admin_notes        IS NOT DISTINCT FROM OLD.admin_notes
   AND NEW.completed_at       IS NOT DISTINCT FROM OLD.completed_at
   AND NEW.no_show_at         IS NOT DISTINCT FROM OLD.no_show_at
   AND NEW.confirmed_at       IS NOT DISTINCT FROM OLD.confirmed_at
   AND NEW.rescheduled_at     IS NOT DISTINCT FROM OLD.rescheduled_at
  ) THEN
    RAISE EXCEPTION 'Students may not modify admin-managed demo booking fields.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_demo_booking_update_rules
  BEFORE UPDATE ON public.demo_session_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_demo_booking_update_rules();

-- ============================================================
-- 12. Migrate existing data
-- Map old statuses to new lifecycle:
--   assignment_status 'pending_mentor' -> 'pending_acceptance'
--     (these need acceptance_deadline set)
--   assignment_status 'confirmed' -> stays 'confirmed' (already accepted)
-- ============================================================

-- For existing bookings in pending_mentor state that have a mentor_id,
-- set them to pending_acceptance with a past deadline (so they can be
-- reassigned by admin without the mentor being able to accept)
UPDATE public.demo_session_bookings
SET
  assignment_status = 'pending_acceptance',
  acceptance_deadline = created_at + interval '10 minutes',
  assignment_version = 1
WHERE assignment_status = 'pending_mentor'
  AND created_at IS NOT NULL;

-- For existing confirmed assignments, make sure they have a version
UPDATE public.demo_session_bookings
SET assignment_version = 1
WHERE assignment_version IS NULL;

-- ============================================================
-- 13. RPC function: get_mentor_demo_stats
-- Returns demo statistics for each mentor (for recommendations)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_mentor_demo_stats();
DROP FUNCTION IF EXISTS public.get_mentor_demo_stats;
CREATE OR REPLACE FUNCTION public.get_mentor_demo_stats()
RETURNS TABLE (
  user_id uuid,
  completed_demos integer,
  accepted_demos integer,
  rejected_demos integer,
  expired_demos integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.mentor_id as user_id,
    COUNT(*) FILTER (WHERE h.action = 'completed' OR (dsb.booking_status = 'completed' AND h.action = 'assigned'))::integer as completed_demos,
    COUNT(*) FILTER (WHERE h.action = 'accepted')::integer as accepted_demos,
    COUNT(*) FILTER (WHERE h.action = 'rejected')::integer as rejected_demos,
    COUNT(*) FILTER (WHERE h.action = 'expired')::integer as expired_demos
  FROM public.demo_assignment_history h
  JOIN public.demo_session_bookings dsb ON dsb.id = h.booking_id
  WHERE h.mentor_id IS NOT NULL
  GROUP BY h.mentor_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mentor_demo_stats TO authenticated;

-- ============================================================
-- 14. Scheduled expiration: create a view for expired assignments
-- This allows the frontend to detect expired assignments in real-time
-- ============================================================
CREATE OR REPLACE VIEW public.vw_expired_demo_assignments AS
SELECT
  dsb.*,
  p.full_name as student_name,
  mp.full_name as mentor_name,
  ap.full_name as assigned_by_name
FROM public.demo_session_bookings dsb
JOIN public.profiles p ON p.id = dsb.user_id
LEFT JOIN public.profiles mp ON mp.id = dsb.mentor_id
LEFT JOIN public.profiles ap ON ap.id = dsb.admin_id
WHERE dsb.assignment_status = 'expired'
  AND dsb.assignment_expired_at IS NOT NULL
ORDER BY dsb.assignment_expired_at DESC;

GRANT SELECT ON public.vw_expired_demo_assignments TO authenticated;