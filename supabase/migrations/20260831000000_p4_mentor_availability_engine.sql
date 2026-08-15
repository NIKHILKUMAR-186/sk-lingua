-- P4 — Mentor Availability & Time Slot Engine
-- Add timezone tracking to availability_slots and harden RLS for admin management

-- 1. Add timezone column to availability_slots
ALTER TABLE public.availability_slots
  ADD COLUMN IF NOT EXISTS timezone text;

-- 2. Update RLS policies to allow admins to manage all availability slots
DROP POLICY IF EXISTS "availability_slots_admin_manage" ON public.availability_slots;

CREATE POLICY "availability_slots_admin_manage"
  ON public.availability_slots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Helper function to prevent overlapping availability slots for the same mentor/day
CREATE OR REPLACE FUNCTION public.check_availability_overlap(
  p_mentor_id uuid,
  p_day_of_week text,
  p_start_time time,
  p_end_time time,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  IF p_start_time >= p_end_time THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.availability_slots
    WHERE mentor_id = p_mentor_id
      AND day_of_week = p_day_of_week
      AND is_available <> false
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
      AND start_time < p_end_time
      AND end_time > p_start_time
  );
END;
$$ LANGUAGE plpgsql;
