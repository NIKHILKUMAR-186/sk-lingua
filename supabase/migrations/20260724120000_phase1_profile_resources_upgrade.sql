ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS learning_goal text,
  ADD COLUMN IF NOT EXISTS target_language text,
  ADD COLUMN IF NOT EXISTS current_level text,
  ADD COLUMN IF NOT EXISTS interests text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text;

ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS teaching_style text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS availability_preview text;

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'session', 'private')),
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS resource_type text NOT NULL DEFAULT 'link' CHECK (resource_type IN ('link', 'file')),
  ADD COLUMN IF NOT EXISTS storage_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('resources', 'resources', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "Resources visibility" ON public.resources;
DROP POLICY IF EXISTS "Mentors manage own resources" ON public.resources;

CREATE POLICY "Resources visibility" ON public.resources
  FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR auth.uid() = mentor_id
    OR auth.uid() = created_by
    OR (
      visibility = 'session'
      AND EXISTS (
        SELECT 1
        FROM public.sessions s
        WHERE s.id = resources.session_id
          AND s.student_id = auth.uid()
          AND s.status = 'completed'
      )
    )
  );

CREATE POLICY "Mentors manage own resources" ON public.resources
  FOR ALL TO authenticated
  USING (auth.uid() = mentor_id OR auth.uid() = created_by)
  WITH CHECK (auth.uid() = mentor_id OR auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated can upload resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete resources" ON storage.objects;

CREATE POLICY "Authenticated can upload resources" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can view resources" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resources');

CREATE POLICY "Authenticated can update resources" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'resources' AND auth.uid() IS NOT NULL)
  WITH CHECK (bucket_id = 'resources' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete resources" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'resources' AND auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_resources_visibility_session
  ON public.resources(visibility, session_id, student_id);
