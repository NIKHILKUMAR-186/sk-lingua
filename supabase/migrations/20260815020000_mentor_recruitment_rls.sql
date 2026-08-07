-- ============================================================
-- Mentor Recruitment System — Phase 6 (Part 3)
-- RLS hardening, private storage bucket, and indexes.
-- ============================================================

-- ============================================================
-- 1. RLS hardening for mentor_applications
-- ============================================================
-- Drop policies (idempotent)
DROP POLICY IF EXISTS "Mentor applications public read" ON public.mentor_applications;
DROP POLICY IF EXISTS "Mentor applications owner read" ON public.mentor_applications;
DROP POLICY IF EXISTS "Mentor applications admin read" ON public.mentor_applications;
DROP POLICY IF EXISTS "Mentor applications insert own record" ON public.mentor_applications;
DROP POLICY IF EXISTS "Mentor applications update own record" ON public.mentor_applications;
DROP POLICY IF EXISTS "Mentor applications admin manage" ON public.mentor_applications;

-- Applicant can read their own application
CREATE POLICY "Mentor applications owner read" ON public.mentor_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all applications
CREATE POLICY "Mentor applications admin read" ON public.mentor_applications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Applicant can insert their own application
CREATE POLICY "Mentor applications insert own record" ON public.mentor_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Applicant can update their own application (draft save)
CREATE POLICY "Mentor applications update own record" ON public.mentor_applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all applications
CREATE POLICY "Mentor applications admin manage" ON public.mentor_applications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. RLS hardening for status history
-- ============================================================
-- Applicant can read their own status history
CREATE POLICY "Status history owner read" ON public.mentor_application_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_applications ma
      WHERE ma.id = mentor_application_status_history.application_id
        AND ma.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. RLS hardening for interviews
-- ============================================================
-- Applicant can read their own interviews
CREATE POLICY "Interviews owner read" ON public.mentor_application_interviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_applications ma
      WHERE ma.id = mentor_application_interviews.application_id
        AND ma.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. Storage bucket for private resumes
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('mentor-resumes', 'mentor-resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Only authenticated users can upload to mentor-resumes
CREATE POLICY "Mentor resumes authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mentor-resumes');

-- Only the owner or admin can read from mentor-resumes
CREATE POLICY "Mentor resumes owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'mentor-resumes'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ============================================================
-- 5. Indexes for performance
-- ============================================================

-- Applicant can insert their own application
DROP POLICY IF EXISTS "Mentor applications insert own record"
ON public.mentor_applications;

CREATE POLICY "Mentor applications insert own record" ON public.mentor_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_applications_status
  ON public.mentor_applications (status);
CREATE INDEX IF NOT EXISTS idx_mentor_applications_email
  ON public.mentor_applications (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_mentor_applications_user
  ON public.mentor_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_applications_created
  ON public.mentor_applications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_status_history_app
  ON public.mentor_application_status_history (application_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mentor_interviews_app
  ON public.mentor_application_interviews (application_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_mentor_activation_app
  ON public.mentor_activation_history (application_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_app
  ON public.mentor_notes (application_id);