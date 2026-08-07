-- ============================================================
-- Fix mentor application submission pipeline
-- 1. Add missing `state` column (form collects it, validation requires it)
-- 2. Change status default to 'draft' so the form isn't replaced
--    by the status page after the first autosave
-- 3. Ensure mentor-resumes bucket exists for resume uploads
-- ============================================================

-- 1. Add missing state column
ALTER TABLE public.mentor_applications
  ADD COLUMN IF NOT EXISTS state text;

-- 2. Change status default to 'draft' (was 'pending')
ALTER TABLE public.mentor_applications
  ALTER COLUMN status SET DEFAULT 'draft';

-- 3. Ensure mentor-resumes bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mentor-resumes', 'mentor-resumes', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Add unique constraint on user_id so upsert (onConflict: "user_id")
--    can create a new row or update the existing one for a given user.
--    A user should only ever have one mentor application.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mentor_applications_user_id_key'
      AND conrelid = 'public.mentor_applications'::regclass
  ) THEN
    ALTER TABLE public.mentor_applications
      ADD CONSTRAINT mentor_applications_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 5. Fix owner-read policy for mentor-resumes bucket.
--    Resume paths are stored as `mentor/{userId}/applications/...`, so the
--    first folder is `mentor`, not the user id. Allow the owner to read their
--    own resume by matching the user id anywhere in the path.
DROP POLICY IF EXISTS "Mentor resumes owner read" ON storage.objects;
CREATE POLICY "Mentor resumes owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'mentor-resumes'
    AND (
      (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );
