-- ============================================================
-- mentor_pending role usage
--
-- This migration runs AFTER 20260830000000_add_mentor_pending_role.sql
-- in its own committed transaction, so the 'mentor_pending' enum
-- value is guaranteed to exist and be usable here. It defines the
-- functions and triggers that reference the new role.
--
--   * get_user_role priority now includes mentor_pending
--     Priority: admin > mentor > mentor_pending > student
--   * welcome notification on mentor signup (mentor_pending role)
-- ============================================================

-- ============================================================
-- Update get_user_role priority to include mentor_pending
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'mentor' THEN 2
      WHEN 'mentor_pending' THEN 3
      WHEN 'student' THEN 4
    END LIMIT 1;
$$;

-- ============================================================
-- RLS: Allow users to insert their own mentor_pending role
-- (already covered by "Users insert own roles" policy, but
--  ensure the role is valid for the enum)
-- ============================================================

-- ============================================================
-- Notification helper: welcome notification on mentor signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_mentor_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'mentor_pending' THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      NEW.user_id,
      'Welcome to Lingua Mentors 🎉',
      'Your mentor account is pending verification. Complete your application to get started.',
      '/mentor/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_mentor_signup ON public.user_roles;
CREATE TRIGGER trg_notify_mentor_signup
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mentor_signup();
