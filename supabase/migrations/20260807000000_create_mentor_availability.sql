-- Create mentor availability table
CREATE TABLE IF NOT EXISTS public.mentor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text,
  working_days text[] DEFAULT '{}', -- e.g. ['mon','tue']
  working_hours jsonb DEFAULT '{}' , -- structured per day
  breaks jsonb DEFAULT '[]',
  unavailable_dates date[] DEFAULT '{}',
  max_daily_sessions integer DEFAULT 0,
  max_weekly_sessions integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_availability TO authenticated;
GRANT ALL ON public.mentor_availability TO service_role;

ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they already exist (idempotent re-run)
DROP POLICY IF EXISTS "Mentor availability owner manage" ON public.mentor_availability;
DROP POLICY IF EXISTS "Mentor availability admin manage" ON public.mentor_availability;

-- Owners can manage their own availability
CREATE POLICY "Mentor availability owner manage" ON public.mentor_availability FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Mentor availability admin manage" ON public.mentor_availability FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_mentor_availability_updated ON public.mentor_availability;
CREATE TRIGGER trg_mentor_availability_updated BEFORE UPDATE ON public.mentor_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
