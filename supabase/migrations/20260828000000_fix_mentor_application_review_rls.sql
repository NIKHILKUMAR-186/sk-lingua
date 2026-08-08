-- ============================================================
-- Fix Mentor Application Review Page RLS
--
-- PROBLEM:
--   The admin review page at /admin/mentor-applications/:id
--   depends on reading related rows from:
--     - mentor_applications
--     - mentor_application_status_history
--     - mentor_application_interviews
--     - mentor_notes
--
--   While "admin manage" policies already grant admins full access
--   (FOR ALL ... USING (has_role(auth.uid(),'admin'))), we add explicit
--   SELECT policies so admins are guaranteed to read ALL rows regardless
--   of any future policy changes. This does NOT weaken security:
--   it only grants admins (who already have full manage rights) read
--   access, and owner-only read policies remain in place for applicants.
--
-- Idempotent: safe to run on fresh and existing databases.
-- ============================================================

-- ============================================================
-- 1. mentor_applications: admins can SELECT all rows
-- ============================================================
DROP POLICY IF EXISTS "Mentor applications admin select" ON public.mentor_applications;
CREATE POLICY "Mentor applications admin select" ON public.mentor_applications
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. mentor_application_status_history: admins can SELECT all rows
-- ============================================================
DROP POLICY IF EXISTS "Status history admin select" ON public.mentor_application_status_history;
CREATE POLICY "Status history admin select" ON public.mentor_application_status_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. mentor_application_interviews: admins can SELECT all rows
-- ============================================================
DROP POLICY IF EXISTS "Interviews admin select" ON public.mentor_application_interviews;
CREATE POLICY "Interviews admin select" ON public.mentor_application_interviews
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. mentor_notes: admins can SELECT all rows
-- ============================================================
DROP POLICY IF EXISTS "Mentor notes admin select" ON public.mentor_notes;
CREATE POLICY "Mentor notes admin select" ON public.mentor_notes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. mentor_activation_history: admins can SELECT all rows
--    (used by the review page's timeline/activation history)
-- ============================================================
DROP POLICY IF EXISTS "Activation history admin select" ON public.mentor_activation_history;
CREATE POLICY "Activation history admin select" ON public.mentor_activation_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
