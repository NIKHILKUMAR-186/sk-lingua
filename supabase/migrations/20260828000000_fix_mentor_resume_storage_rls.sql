-- ============================================================
-- Mentor Resume Upload Pipeline — Hardening & RLS Enforcement
--
-- SCOPE:
--   * Enforce path-based ownership on the private `mentor-resumes`
--     storage bucket so users can only upload/read/update/delete
--     files inside `mentor/{auth.uid()}/...`.
--   * Keep the bucket private and RLS enabled (no public access).
--   * Admins retain full access.
--
-- PATH CONVENTION (single source of truth):
--   mentor/{userId}/applications/{file}.pdf
--   storage.foldername(name)[2] == userId
--
-- Idempotent: safe to run on fresh and existing databases.
-- ============================================================

-- ============================================================
-- 1. Ensure the private bucket exists (idempotent)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('mentor-resumes', 'mentor-resumes', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Wipe any pre-existing, overly-broad policies so we can
--    recreate them with strict owner-folder enforcement.
-- ============================================================
DROP POLICY IF EXISTS "Mentor resumes authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Mentor resumes owner read" ON storage.objects;
DROP POLICY IF EXISTS "Mentor resumes owner insert" ON storage.objects;
DROP POLICY IF EXISTS "Mentor resumes owner update" ON storage.objects;
DROP POLICY IF EXISTS "Mentor resumes owner delete" ON storage.objects;
DROP POLICY IF EXISTS "Mentor resumes admin all" ON storage.objects;

-- ============================================================
-- 3. INSERT: a user may upload ONLY into their OWN folder
--      mentor/{auth.uid()}/...
--    Admins may upload anywhere (for support/repair).
--    The folder at index [2] must equal the caller's auth.uid().
-- ============================================================
CREATE POLICY "Mentor resumes owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'mentor-resumes'
    AND (
      (storage.foldername(name))[1] = 'mentor'
      AND (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ============================================================
-- 4. SELECT: a user may read ONLY their own folder; admins read all.
-- ============================================================
CREATE POLICY "Mentor resumes owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'mentor-resumes'
    AND (
      (storage.foldername(name))[1] = 'mentor'
      AND (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ============================================================
-- 5. UPDATE: a user may update ONLY their own folder; admins all.
-- ============================================================
CREATE POLICY "Mentor resumes owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'mentor-resumes'
    AND (
      (storage.foldername(name))[1] = 'mentor'
      AND (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'mentor-resumes'
    AND (
      (storage.foldername(name))[1] = 'mentor'
      AND (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ============================================================
-- 6. DELETE: a user may delete ONLY their own folder; admins all.
-- ============================================================
CREATE POLICY "Mentor resumes owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'mentor-resumes'
    AND (
      (storage.foldername(name))[1] = 'mentor'
      AND (storage.foldername(name))[2] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ============================================================
-- 7. Backward compatibility for EXISTING resumes uploaded under
--    the older, looser convention. The old path was:
--      mentor/{userId}/applications/...   (same as current)
--    so existing files already satisfy the [2] == userId rule.
--    No data migration is required. Files remain accessible to
--    their owner and admins.
--    (Documented here for operational clarity.)
-- ============================================================
