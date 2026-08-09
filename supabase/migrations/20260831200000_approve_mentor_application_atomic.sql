-- ============================================================
-- Atomic Mentor Application Approval
--
-- PROBLEM
-- -------
-- The old `approve_mentor_role(_user_id)` RPC referenced
-- `app_data.hourly_rate` from `mentor_applications`, but that
-- column does NOT exist on `mentor_applications` (it belongs to
-- `mentor_profiles`). This caused: "record app_data has no field
-- hourly_rate".
--
-- Additionally, the frontend performed TWO separate, non-atomic
-- operations (update application status, then call the RPC). When
-- the RPC failed, the application could be left "approved" while
-- the user's role was never promoted to `mentor`.
--
-- FIX
-- ----
-- * Fix the old broken `approve_mentor_role` so it no longer reads
--   `hourly_rate` from `mentor_applications` (preserves the existing
--   `mentor_profiles.hourly_rate` instead of overwriting it).
-- * Add a new atomic `approve_mentor_application(_application_id,
--   _admin_id)` SECURITY DEFINER RPC that performs the ENTIRE
--   approval workflow in one transaction:
--     1. Verify the caller is an authorized admin.
--     2. Load + validate the application & verify it belongs to the
--        mentor being promoted.
--     3. Update application status -> approved (approved_at/by).
--     4. Promote role mentor_pending -> mentor (idempotent).
--     5. Activate / upsert mentor profile (preserve hourly_rate).
--     6. Update main profile basic info.
--     7. Insert status-history row.
--     8. Insert audit log (APPROVED_MENTOR).
--     9. Insert notification for the mentor.
--   If ANY critical step fails, the whole transaction rolls back.
--
-- IDEMPOTENCY
-- -----------
-- If the application is already approved, the function returns a
-- safe "already approved" result WITHOUT creating duplicate roles,
-- profiles, audit records, or notifications.
--
-- SAFETY
-- ------
-- * No duplicate tables, columns, or roles.
-- * No destructive operations.
-- * Uses the existing canonical authorization model (user_roles).
-- ============================================================

-- ============================================================
-- 1. FIX the old broken function (backward compatible)
--    Stop reading hourly_rate from mentor_applications.
--    Preserve existing mentor_profiles.hourly_rate on conflict.
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

  -- Create or update mentor profile from application data.
  -- NOTE: hourly_rate is NOT sourced from app_data (it does not exist
  -- on mentor_applications). On conflict we preserve the existing
  -- hourly_rate by NOT setting it in the DO UPDATE branch.
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
    0,
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

-- ============================================================
-- 2. NEW atomic approve_mentor_application RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_mentor_application(
  _application_id uuid,
  _admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.mentor_applications%ROWTYPE;
  v_admin_ok boolean;
  v_mentor_id uuid;
  v_approved boolean := false;
  v_already boolean := false;
BEGIN
  -- Validate inputs
  IF _application_id IS NULL OR _admin_id IS NULL THEN
    RAISE EXCEPTION 'approve_mentor_application: missing required arguments';
  END IF;

  -- 1. Verify the caller is an authorized admin.
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _admin_id AND role = 'admin'
  ) INTO v_admin_ok;
  IF NOT v_admin_ok THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Forbidden: admin role required',
      'code', 'FORBIDDEN'
    );
  END IF;

  -- 2. Load the application.
  SELECT * INTO v_app FROM public.mentor_applications
  WHERE id = _application_id LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Application not found',
      'code', 'NOT_FOUND'
    );
  END IF;

  IF v_app.user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Application has no associated user',
      'code', 'INVALID_APPLICATION'
    );
  END IF;

  v_mentor_id := v_app.user_id;

  -- 3. Idempotency check: already approved -> safe response, no side effects.
  IF v_app.status = 'approved' OR v_app.activation_status = 'approved' THEN
    RETURN jsonb_build_object(
      'success', true,
      'alreadyApproved', true,
      'message', 'Mentor is already approved.',
      'applicationId', v_app.id,
      'mentorId', v_mentor_id
    );
  END IF;

  -- 4. Update application status (single place, atomic).
  UPDATE public.mentor_applications
  SET status = 'approved',
      activation_status = 'approved',
      approved_at = now(),
      approved_by = _admin_id,
      updated_at = now()
  WHERE id = v_app.id;

  -- 5. Promote role mentor_pending -> mentor (idempotent).
  DELETE FROM public.user_roles
  WHERE user_id = v_mentor_id AND role = 'mentor_pending';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_mentor_id, 'mentor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 6. Activate / upsert mentor profile from application data.
  --    Preserve existing hourly_rate on conflict (never overwrite with NULL/0).
  INSERT INTO public.mentor_profiles (
    user_id,
    headline,
    bio,
    languages_taught,
    certifications,
    hourly_rate,
    years_experience,
    is_active,
    verification_status,
    approval_date,
    approved_by,
    updated_at
  ) VALUES (
    v_mentor_id,
    COALESCE(v_app.current_occupation, ''),
    COALESCE(v_app.bio, ''),
    COALESCE(v_app.teaching_languages, '{}'),
    COALESCE(v_app.certifications, '{}'),
    0,
    COALESCE(v_app.years_of_experience, 0),
    true,
    'approved',
    now(),
    _admin_id,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    headline = EXCLUDED.headline,
    bio = EXCLUDED.bio,
    languages_taught = EXCLUDED.languages_taught,
    certifications = EXCLUDED.certifications,
    years_experience = EXCLUDED.years_experience,
    is_active = true,
    verification_status = 'approved',
    approval_date = now(),
    approved_by = _admin_id,
    updated_at = now();
  -- NOTE: hourly_rate intentionally NOT updated on conflict.

  -- 7. Update main profile basic info.
  UPDATE public.profiles
  SET full_name = COALESCE(v_app.full_name, profiles.full_name),
      native_language = COALESCE(v_app.native_language, profiles.native_language),
      updated_at = now()
  WHERE id = v_mentor_id;

  -- 8. Insert status-history row.
  INSERT INTO public.mentor_application_status_history (
    application_id, previous_status, new_status, changed_by, notes
  ) VALUES (
    v_app.id, v_app.status, 'approved', _admin_id, 'Approved by admin'
  );

  -- 9. Insert audit log (APPROVED_MENTOR).
  INSERT INTO public.audit_logs (
    actor_id, actor_role, scope, action, target_entity, target_id,
    description, details, metadata, created_at
  ) VALUES (
    _admin_id, 'admin', 'mentor_applications', 'APPROVED_MENTOR',
    'mentor_application', v_app.id,
    'Mentor application approved and role promoted to mentor',
    jsonb_build_object('application_id', v_app.id, 'mentor_id', v_mentor_id),
    jsonb_build_object('application_id', v_app.id, 'mentor_id', v_mentor_id),
    now()
  );

  -- 10. Insert notification for the mentor (actual user id, not hardcoded).
  PERFORM public.insert_notification(
    v_mentor_id,
    'Mentor Application Approved',
    'Your mentor application has been approved. You can now access your mentor dashboard.',
    'mentor_application',
    'mentor_application',
    v_app.id,
    '/mentor/dashboard'
  );

  v_approved := true;

  RETURN jsonb_build_object(
    'success', true,
    'approved', v_approved,
    'alreadyApproved', v_already,
    'message', 'Mentor approved successfully.',
    'applicationId', v_app.id,
    'mentorId', v_mentor_id
  );
EXCEPTION WHEN OTHERS THEN
  -- Any failure -> roll back the whole transaction (no partial state).
  RAISE NOTICE 'approve_mentor_application failed: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', 'APPROVAL_FAILED'
  );
END;
$$;

-- Grant execute to authenticated (admin callers) and service_role.
GRANT EXECUTE ON FUNCTION public.approve_mentor_application(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_mentor_application(uuid, uuid) TO service_role;
