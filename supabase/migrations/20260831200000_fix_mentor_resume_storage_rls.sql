-- ============================================================
-- Fix Mentor Resume Storage RLS + Signed URL Access
--
-- PROBLEM:
--   Resume uploads go to the private `mentor-resumes` bucket at the path
--     mentor/{userId}/applications/{uuid}-{file.name}
--   The existing "Mentor resumes owner read" policy checked
--     (storage.foldername(name))[1] = auth.uid()::text
--   For that path, storage.foldername(path) = {mentor, <userId>, applications},
--   so [1] is ALWAYS 'mentor' and NEVER equals the caller's auth.uid().
--
--   As a result, the OWNDER could not SELECT their own uploaded object, which
--   broke `supabase.storage.createSignedUrl()` (the client must have row-level
--   SELECT access to the object to mint a signed URL). Both the client-side
--   `createSignedUrlForPath()` helper and the resume preview relied on this.
--
-- FIX:
--   Change the owner check to index [2], which is the actual auth.uid() folder
--   component for the `mentor/{userId}/applications/...` convention. Admins
--   keep full access. The INSERT (upload) policy is unchanged and still lets
--   any authenticated user upload to the private bucket.
--
-- Idempotent: safe to run on fresh and existing databases.
-- ============================================================

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

-- Also guarantee admins can ALWAYS read objects in the private bucket
-- (some older databases may only have the owner/admin-combined policy above).
DROP POLICY IF EXISTS "Mentor resumes admin read" ON storage.objects;

CREATE POLICY "Mentor resumes admin read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'mentor-resumes'
    AND public.has_role(auth.uid(), 'admin')
  );
