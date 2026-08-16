-- Harden availability_slots table with constraints to prevent invalid data
-- This addresses the root cause of the "Invalid time value" crash

-- 1. Add check constraint for valid time format (HH:MI:MI format, time must be valid)
-- PostgreSQL TIME type already validates format, but we add additional constraints
ALTER TABLE public.availability_slots
  ADD CONSTRAINT IF NOT EXISTS availability_slots_start_time_valid
  CHECK (start_time IS NULL OR start_time <> '');

ALTER TABLE public.availability_slots
  ADD CONSTRAINT IF NOT EXISTS availability_slots_end_time_valid
  CHECK (end_time IS NULL OR end_time <> '');

-- 2. Ensure start_time is before end_time when both are present
ALTER TABLE public.availability_slots
  ADD CONSTRAINT IF NOT EXISTS availability_slots_time_order
  CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time);

-- 3. Add index for faster queries by day and availability status
CREATE INDEX IF NOT EXISTS idx_availability_slots_day_available
  ON public.availability_slots (day_of_week, is_available);

-- 4. Add a trigger to validate and normalize data on insert/update
CREATE OR REPLACE FUNCTION public.validate_availability_slot()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure day_of_week is lowercase and valid
  IF NEW.day_of_week IS NOT NULL THEN
    NEW.day_of_week := LOWER(TRIM(NEW.day_of_week));
    
    -- Validate day_of_week is one of the valid values
    IF NEW.day_of_week NOT IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun') THEN
      RAISE EXCEPTION 'Invalid day_of_week: %. Must be one of: mon, tue, wed, thu, fri, sat, sun', NEW.day_of_week;
    END IF;
  END IF;

  -- Ensure is_available is not null
  IF NEW.is_available IS NULL THEN
    NEW.is_available := true;
  END IF;

  -- Ensure mentor_id is not null
  IF NEW.mentor_id IS NULL THEN
    RAISE EXCEPTION 'mentor_id cannot be null';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_validate_availability_slot ON public.availability_slots;

-- Create trigger
CREATE TRIGGER trg_validate_availability_slot
  BEFORE INSERT OR UPDATE ON public.availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_availability_slot();

-- 5. Log existing invalid records for cleanup
-- This query identifies potentially problematic records
-- Run this manually to check for issues:
-- SELECT id, mentor_id, day_of_week, start_time, end_time, is_available
-- FROM availability_slots
-- WHERE start_time IS NULL 
--    OR end_time IS NULL 
--    OR start_time >= end_time
--    OR day_of_week NOT IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');

-- 6. Update updated_at timestamp trigger
DROP TRIGGER IF EXISTS trg_update_availability_slots_updated_at ON public.availability_slots;

CREATE TRIGGER trg_update_availability_slots_updated_at
  BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();