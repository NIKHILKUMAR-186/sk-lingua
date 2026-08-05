-- Mentor applications for admin review
CREATE TABLE public.mentor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  native_language text NOT NULL,
  teaching_languages text[] NOT NULL DEFAULT '{}',
  experience text,
  teaching_style text,
  sample_lessons text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_applications TO authenticated;
GRANT SELECT ON public.mentor_applications TO anon;
GRANT ALL ON public.mentor_applications TO service_role;
ALTER TABLE public.mentor_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentor applications public read" ON public.mentor_applications FOR SELECT TO anon USING (true);
CREATE POLICY "Mentor applications insert own record" ON public.mentor_applications FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "Mentor applications update own record" ON public.mentor_applications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Mentor applications admin manage" ON public.mentor_applications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER trg_mentor_applications_updated BEFORE UPDATE ON public.mentor_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
