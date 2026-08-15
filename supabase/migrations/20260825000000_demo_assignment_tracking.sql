-- ============================================================
-- Demo Session Assignment Tracking
-- Adds assignment_status to demo_session_bookings and updates
-- RLS so mentors can read/update demos assigned to them.
-- ============================================================

-- 1. Add assignment_status column
ALTER TABLE public.demo_session_bookings
  ADD COLUMN IF NOT EXISTS assignment_status text DEFAULT 'unassigned';

-- 2. Drop the blanket mentor denial policy
DROP POLICY IF EXISTS "Demo bookings mentor no access" ON public.demo_session_bookings;

-- 3. Allow mentors to read bookings assigned to them
CREATE POLICY "Demo bookings mentor read assigned" ON public.demo_session_bookings
  FOR SELECT TO authenticated
  USING (mentor_id = auth.uid());

-- 4. Allow mentors to update assignment response fields on bookings assigned to them
CREATE POLICY "Demo bookings mentor update assignment" ON public.demo_session_bookings
  FOR UPDATE TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- 5. Update the update rules trigger to allow assigned mentors to update assignment_status
DROP TRIGGER IF EXISTS trg_enforce_demo_booking_update_rules
  ON public.demo_session_bookings;
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
  v_is_admin := v_uid IS NULL OR public.has_role(v_uid, 'admin');
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Allow the assigned mentor to update assignment-related fields
  v_is_assigned_mentor := NEW.mentor_id = v_uid;
  IF v_is_assigned_mentor THEN
    RETURN NEW;
  END IF;

  -- Only the booking owner may touch their own booking.
  IF v_uid IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Only the booking owner or an admin may update this demo booking.'
      USING ERRCODE = '42501';
  END IF;

  -- Students may ONLY cancel: the new status must be 'cancelled'.
  IF NEW.booking_status IS DISTINCT FROM 'cancelled' THEN
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
