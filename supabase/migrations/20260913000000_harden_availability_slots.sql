-- Harden availability_slots table with constraints to prevent invalid data
-- This addresses the root cause of the "Invalid time value" crash

-- 1. Ensure start_time is before end_time when both are present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'availability_slots_time_order' 
    AND conrelid = 'public.availability_slots'::regclass
  ) THEN
    ALTER TABLE public.availability_slots
      ADD CONSTRAINT availability_slots_time_order
      CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time);
  END IF;
END;
$$;

-- 3. Add index for faster queries by day and availability status
CREATE INDEX IF NOT EXISTS idx_availability_slots_day_available
  ON public.availability_slots (day_of_week, is_available);

-- 4. Add a trigger to validate and normalize data on insert/update
CREATE OR REPLACE FUNCTION public.validate_availability_slot()
RETURNS TRIGGER AS $$
DECLARE
  _day TEXT;
  _idx INT;
BEGIN
  -- Normalize to a lowercase, trimmed day identifier.
  IF NEW.day_of_week IS NOT NULL THEN
    _day := LOWER(TRIM(NEW.day_of_week));

    -- Accept both short (mon) and full (monday) weekday names by mapping
    -- the (possibly abbreviated) token to its canonical full name.
    SELECT i INTO _idx
    FROM   unnest(ARRAY['mon','tue','wed','thu','fri','sat','sun']) WITH ORDINALITY AS t(token, i)
    WHERE  t.token = _day;
    IF _idx IS NOT NULL THEN
      NEW.day_of_week := (SELECT d FROM unnest(ARRAY[
        'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
      ]) WITH ORDINALITY AS t2(d, i2) WHERE t2.i2 = _idx);
      RETURN NEW;
    END IF;

    -- Already a full lowercase weekday name?
    IF _day IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday') THEN
      NEW.day_of_week := _day;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid day_of_week: %. Expected a weekday name such as monday, tuesday, ... sunday.', _day;
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