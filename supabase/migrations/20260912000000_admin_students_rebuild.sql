-- ============================================================
-- Admin → Students production rebuild
-- ============================================================
-- Root-cause fixes for the Admin Students management console:
--
--  1. ROLE VISIBILITY
--     user_roles only had "Users read own roles" (auth.uid() = user_id),
--     so an admin using the *client* supabase could not scan users by role,
--     and realtime 'role' changes were not visible to admins.
--     This migration adds an ADMIN read policy (admin-only) so admins can
--     read every role row (Students list + dashboard student count) and
--     receive realtime role events, while non-admins are untouched.
--
--  2. REALTIME PUBLICATION
--     student_subscriptions, profiles, user_roles, sessions and
--     subscription_plans were missing from the supabase_realtime
--     publication, so realtime subscriptions silently did nothing.
--     We add them idempotently.
--
--  3. PROFILE FIELDS
--     The student detail management console requires admin-editable
--     phone / city / learning-level / learning-goals fields. These do not
--     exist yet, so we add them additively (IF NOT EXISTS) without touching
--     any existing columns, data or relationships. Email remains read-only
--     (managed auth-side only).
--
-- The migration is idempotent and safe to re-run.
-- ============================================================

-- ============================================================
-- 1. Admin role visibility on user_roles
-- ============================================================
DROP POLICY IF EXISTS "user_roles_admin_read" ON public.user_roles;
CREATE POLICY "user_roles_admin_read"
  ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON POLICY "user_roles_admin_read" ON public.user_roles IS
  'Admins may read all role rows so the Admin Students management console and dashboard student count reflect the real role data. Non-admins remain restricted to their own rows.';

-- ============================================================
-- 2. Add core tables to the realtime publication (idempotent)
-- ============================================================
DO $$
DECLARE
  v_tab text;
BEGIN
  FOREACH v_tab IN ARRAY ARRAY[
    'student_subscriptions',
    'profiles',
    'user_roles',
    'sessions',
    'subscription_plans',
    'subscription_history'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_tab
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_tab);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 3. Admin-editable student profile fields (additive)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS learning_level text,
  ADD COLUMN IF NOT EXISTS learning_goals text;

COMMENT ON COLUMN public.profiles.phone_number IS 'Student phone number (admin editable)';
COMMENT ON COLUMN public.profiles.city IS 'Student city (admin editable)';
COMMENT ON COLUMN public.profiles.learning_level IS 'Student learning level (admin editable)';
COMMENT ON COLUMN public.profiles.learning_goals IS 'Student learning goals (admin editable)';

GRANT SELECT, UPDATE (full_name, avatar_url, bio, native_language, target_language,
  current_level, learning_goal, learning_level, learning_goals, interests,
  country, state, city, phone_number, timezone)
  ON public.profiles TO authenticated;

-- ============================================================
-- 4. Indexes for the admin students list query
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_active_idx
  ON public.student_subscriptions (user_id, status, expires_at DESC);