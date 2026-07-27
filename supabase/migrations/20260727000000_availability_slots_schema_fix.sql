-- Ensure availability_slots exists with the columns used by the app
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  label text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS availability_slots_mentor_idx ON public.availability_slots (mentor_id);
CREATE INDEX IF NOT EXISTS availability_slots_mentor_day_idx ON public.availability_slots (mentor_id, day_of_week);

-- Drop existing policies first (if any exist from previous migrations)
DROP POLICY IF EXISTS availability_owner ON public.availability_slots;
DROP POLICY IF EXISTS availability_slots_auth ON public.availability_slots;
DROP POLICY IF EXISTS availability_slots_insert ON public.availability_slots;
DROP POLICY IF EXISTS availability_slots_select ON public.availability_slots;
DROP POLICY IF EXISTS availability_slots_update ON public.availability_slots;
DROP POLICY IF EXISTS availability_slots_delete ON public.availability_slots;

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

-- INSERT: Mentor can insert their own availability slots
CREATE POLICY availability_slots_insert_own
  ON public.availability_slots
  FOR INSERT
  WITH CHECK (mentor_id = auth.uid());

-- SELECT: Any authenticated user can view all availability slots
CREATE POLICY availability_slots_select_all
  ON public.availability_slots
  FOR SELECT
  USING (true);

-- UPDATE: Mentor can update only their own slots
CREATE POLICY availability_slots_update_own
  ON public.availability_slots
  FOR UPDATE
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- DELETE: Mentor can delete only their own slots
CREATE POLICY availability_slots_delete_own
  ON public.availability_slots
  FOR DELETE
  USING (mentor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_availability_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_availability_slots_updated_at ON public.availability_slots;
CREATE TRIGGER trg_update_availability_slots_updated_at
BEFORE UPDATE ON public.availability_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_availability_slots_updated_at();
