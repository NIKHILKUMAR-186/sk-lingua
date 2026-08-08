-- ============================================================
-- Fix mentor signup role assignment at the database level
--
-- ROOT CAUSE
-- ----------
-- The original on_auth_user_created trigger (handle_new_user in
-- 20260723150814) only inserted a row into `profiles` and
-- `streak_points`. It never inserted a row into `user_roles` and
-- it ignored the `intended_role` metadata that the signup forms
-- pass to supabase.auth.signUp({ options: { data: { intended_role } } }).
--
-- Because role assignment lived ONLY in client handlers that require
-- an immediate session, the email-confirmation lifecycle (where
-- signUp() returns session = null) never created the mentor_pending
-- role. The user verified their email, had a profile but NO role,
-- and the onboarding page then defaulted them to `student`.
--
-- This migration moves role assignment into the trigger so it works
-- for EVERY signup regardless of session timing, and it repairs any
-- existing mentor-intent users who were incorrectly left without a
-- mentor_pending role.
--
-- IDEMPOTENCY / SAFETY
-- --------------------
-- * Never create duplicate profiles (ON CONFLICT DO NOTHING).
-- * Never overwrite an existing valid role (ON CONFLICT DO NOTHING).
-- * Never downgrade a mentor back to student.
-- * Genuine student accounts are left untouched.
-- ============================================================

-- ============================================================
-- 1. Rewrite handle_new_user to assign role from intended_role
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_intended text;
  v_full_name text;
BEGIN
  v_intended := lower(COALESCE(trim(NEW.raw_user_meta_data->>'intended_role'), ''));
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Always ensure a profile row exists (no duplicates).
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (NEW.id, v_full_name, NEW.email, NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  -- Always ensure a streak row exists (no duplicates).
  INSERT INTO public.streak_points (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign the role based on signup intent.
  IF v_intended = 'mentor' THEN
    -- Mentor signup -> mentor_pending role + a mentor profile (inactive).
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'mentor_pending')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.mentor_profiles (user_id, headline, bio, languages_taught, certifications, hourly_rate, years_experience, is_active)
    VALUES (NEW.id, '', '', '{}', '{}', 0, 0, false)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- Student (and any other / unspecified) signup -> student role.
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. Repair existing mentor-intent users who were left without a
--    mentor_pending role (or were defaulted to student).
--
--    Only touches users whose signup intent was 'mentor'. It adds
--    the mentor_pending role and a mentor profile IF they are
--    missing. It never removes student roles (the active role
--    priority already prefers mentor_pending > student), and it
--    never modifies genuine student accounts.
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT au.id
    FROM auth.users au
    WHERE lower(trim(au.raw_user_meta_data->>'intended_role')) = 'mentor'
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = au.id
          AND ur.role IN ('mentor', 'mentor_pending')
      )
  LOOP
    -- Add mentor_pending role (idempotent).
    INSERT INTO public.user_roles (user_id, role)
    VALUES (r.id, 'mentor_pending')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Ensure a mentor profile exists.
    INSERT INTO public.mentor_profiles (user_id, headline, bio, languages_taught, certifications, hourly_rate, years_experience, is_active)
    VALUES (r.id, '', '', '{}', '{}', 0, 0, false)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END
$$;
