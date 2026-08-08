-- ============================================================
-- Approve mentor role transition function
--
-- This migration adds a SECURITY DEFINER function that allows
-- admins to approve mentor applications by:
--   1. Removing the mentor_pending role
--   2. Adding the mentor role
--   3. Activating the mentor profile
--
-- This bypasses RLS policies that block direct user_roles updates.
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_mentor_role(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  app_data record;
BEGIN
  -- Get application data to populate profile
  SELECT * INTO app_data FROM public.mentor_applications WHERE user_id = _user_id LIMIT 1;

  -- Remove mentor_pending role
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = 'mentor_pending';

  -- Add mentor role (idempotent)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'mentor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create or update mentor profile from application data
  INSERT INTO public.mentor_profiles (
    user_id,
    headline,
    bio,
    languages_taught,
    certifications,
    hourly_rate,
    years_experience,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    _user_id,
    COALESCE(app_data.current_occupation, ''),
    COALESCE(app_data.bio, ''),
    COALESCE(app_data.teaching_languages, '{}'),
    COALESCE(app_data.certifications, '{}'),
    COALESCE(app_data.hourly_rate, 0),
    COALESCE(app_data.years_of_experience, 0),
    true,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    headline = EXCLUDED.headline,
    bio = EXCLUDED.bio,
    languages_taught = EXCLUDED.languages_taught,
    certifications = EXCLUDED.certifications,
    hourly_rate = EXCLUDED.hourly_rate,
    years_experience = EXCLUDED.years_experience,
    is_active = true,
    updated_at = now();

  -- Also update the main profile with basic info from application
  UPDATE public.profiles
  SET
    full_name = COALESCE(app_data.full_name, profiles.full_name),
    native_language = COALESCE(app_data.native_language, profiles.native_language),
    updated_at = now()
  WHERE id = _user_id;
END;
$$;

-- Grant execute permission to authenticated users (admins will use this via RPC)
GRANT EXECUTE ON FUNCTION public.approve_mentor_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_mentor_role(uuid) TO service_role;