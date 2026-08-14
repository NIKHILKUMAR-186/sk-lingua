-- ============================================================
-- P3: ADMIN STUDENT MANAGEMENT & SUBSCRIPTION CONTROL
-- ============================================================
-- Corrected architecture: STUDENTS are the primary entity.
-- Subscription management is a section INSIDE each student's
-- detail view, not the other way around.
--
-- Reuses the existing student_subscriptions + subscription_slot_adjustments
-- (audit ledger) architecture from P1/P2. Adds server-side ATOMIC,
-- admin-guarded operations.
--
-- Operations:
--   - admin_create_subscription   : create a fresh entitlement for a student
--   - admin_replace_plan          : swap a student's plan (preserves history)
--   - admin_activate_subscription : reactivate an existing entitlement
--   - admin_deactivate_subscription : cancel an active entitlement
--   - admin_adjust_sessions       : add / remove usable sessions
--   - admin_extend_expiry         : extend subscription expiry
--
-- Every mutation is a single SECURITY DEFINER transaction that:
--   - locks the subscription row (FOR UPDATE) against lost updates,
--   - writes the new balance/status/expiry,
--   - appends an immutable entry to subscription_slot_adjustments.
--
-- Authorization: a directly-invoking logged-in user must hold the 'admin'
-- role (server-side check). Server API routes call via the service role
-- (auth.uid() IS NULL) and pass the authenticated admin's id explicitly after
-- requireAdminAuth().
-- ============================================================

CREATE OR REPLACE FUNCTION public.p3_resolve_admin_id(p_admin_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin uuid;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Forbidden: admin role required'
        USING ERRCODE = '42501';
    END IF;
    v_admin := auth.uid();
  ELSE
    IF p_admin_id IS NULL THEN
      RAISE EXCEPTION 'admin_id is required'
        USING ERRCODE = '22023';
    END IF;
    v_admin := p_admin_id;
  END IF;
  RETURN v_admin;
END;
$$;

GRANT EXECUTE ON FUNCTION public.p3_resolve_admin_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.p3_resolve_admin_id(uuid) TO service_role;

-- ============================================================
-- CREATE a fresh subscription entitlement for a student.
-- Used when the student has NO existing subscription.
-- Does NOT modify subscription_plans (global plan stays untouched).
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_create_subscription(
  p_student_id uuid,
  p_plan_id uuid,
  p_reason text DEFAULT '',
  p_admin_id uuid DEFAULT NULL
)
RETURNS public.student_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_student public.profiles;
  v_plan public.subscription_plans;
  v_admin uuid;
  v_new_sub public.student_subscriptions;
  v_now timestamptz := now();
BEGIN
  v_admin := public.p3_resolve_admin_id(p_admin_id);

  SELECT * INTO v_student FROM public.profiles WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription plan not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.student_subscriptions (
    user_id, plan_id, status,
    current_session_slots, total_session_slots, used_session_slots, bonus_slots,
    purchased_at, activated_at, expires_at,
    price_at_purchase, currency_at_purchase, validity_days_at_purchase
  ) VALUES (
    p_student_id, p_plan_id, 'active',
    v_plan.num_sessions, v_plan.num_sessions, 0, 0,
    v_now, v_now,
    CASE
      WHEN v_plan.validity_days IS NOT NULL AND v_plan.validity_days > 0
      THEN v_now + make_interval(days => v_plan.validity_days)
      ELSE NULL
    END,
    v_plan.price, COALESCE(v_plan.currency, 'INR'), v_plan.validity_days
  )
  RETURNING * INTO v_new_sub;

  INSERT INTO public.subscription_slot_adjustments (
    student_id, subscription_id, admin_id, action,
    old_remaining_slots, new_remaining_slots,
    old_bonus_slots, new_bonus_slots,
    reason, metadata
  ) VALUES (
    v_new_sub.user_id, v_new_sub.id, v_admin, 'create',
    0, v_new_sub.current_session_slots,
    0, 0,
    COALESCE(NULLIF(p_reason, ''), 'Subscription created by admin'),
    jsonb_build_object(
      'plan_id', p_plan_id,
      'plan_name', v_plan.name,
      'total_sessions', v_plan.num_sessions,
      'admin_action', 'create_subscription'
    )
  );

  RETURN v_new_sub;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_subscription(uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_subscription(uuid, uuid, text, uuid) TO service_role;

-- ============================================================
-- REPLACE the plan of an existing subscription.
-- Preserves historical data: old subscription is cancelled,
-- a new entitlement is created with the selected plan.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_replace_plan(
  p_subscription_id uuid,
  p_new_plan_id uuid,
  p_reason text DEFAULT '',
  p_admin_id uuid DEFAULT NULL
)
RETURNS public.student_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_old_sub public.student_subscriptions;
  v_new_plan public.subscription_plans;
  v_admin uuid;
  v_new_sub public.student_subscriptions;
  v_now timestamptz := now();
BEGIN
  v_admin := public.p3_resolve_admin_id(p_admin_id);

  SELECT * INTO v_old_sub FROM public.student_subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_new_plan FROM public.subscription_plans WHERE id = p_new_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'New subscription plan not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_old_sub.status = 'active' THEN
    UPDATE public.student_subscriptions
    SET status = 'cancelled',
        cancelled_at = v_now,
        cancellation_reason = COALESCE(NULLIF(p_reason, ''), 'Plan replaced by admin'),
        updated_at = v_now
    WHERE id = v_old_sub.id;

    INSERT INTO public.subscription_slot_adjustments (
      student_id, subscription_id, admin_id, action,
      old_remaining_slots, new_remaining_slots,
      old_bonus_slots, new_bonus_slots,
      reason, metadata
    ) VALUES (
      v_old_sub.user_id, v_old_sub.id, v_admin, 'suspend',
      v_old_sub.current_session_slots, v_old_sub.current_session_slots,
      v_old_sub.bonus_slots, v_old_sub.bonus_slots,
      COALESCE(NULLIF(p_reason, ''), 'Subscription plan replaced by admin'),
      jsonb_build_object('admin_action', 'replace_plan', 'new_plan_id', p_new_plan_id)
    );
  END IF;

  INSERT INTO public.student_subscriptions (
    user_id, plan_id, status,
    current_session_slots, total_session_slots, used_session_slots, bonus_slots,
    purchased_at, activated_at, expires_at,
    price_at_purchase, currency_at_purchase, validity_days_at_purchase
  ) VALUES (
    v_old_sub.user_id, p_new_plan_id, 'active',
    v_new_plan.num_sessions, v_new_plan.num_sessions, 0, 0,
    v_now, v_now,
    CASE
      WHEN v_new_plan.validity_days IS NOT NULL AND v_new_plan.validity_days > 0
      THEN v_now + make_interval(days => v_new_plan.validity_days)
      ELSE NULL
    END,
    v_new_plan.price, COALESCE(v_new_plan.currency, 'INR'), v_new_plan.validity_days
  )
  RETURNING * INTO v_new_sub;

  INSERT INTO public.subscription_slot_adjustments (
    student_id, subscription_id, admin_id, action,
    old_remaining_slots, new_remaining_slots,
    old_bonus_slots, new_bonus_slots,
    reason, metadata
  ) VALUES (
    v_new_sub.user_id, v_new_sub.id, v_admin, 'create',
    0, v_new_sub.current_session_slots,
    0, 0,
    COALESCE(NULLIF(p_reason, ''), 'New subscription created by admin'),
    jsonb_build_object(
      'plan_id', p_new_plan_id,
      'plan_name', v_new_plan.name,
      'total_sessions', v_new_plan.num_sessions,
      'admin_action', 'replace_plan',
      'old_subscription_id', v_old_sub.id
    )
  );

  RETURN v_new_sub;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_replace_plan(uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_replace_plan(uuid, uuid, text, uuid) TO service_role;

-- ============================================================
-- ACTIVATE a student subscription.
-- Does NOT modify subscription_plans (global plan stays untouched).
-- Deterministic rule: an expired entitlement is never silently
-- reactivated with its stale expiry; extend expiry first.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_activate_subscription(
  p_subscription_id uuid,
  p_reason text DEFAULT '',
  p_admin_id uuid DEFAULT NULL
)
RETURNS public.student_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_sub public.student_subscriptions;
  v_admin uuid;
  v_plan_exists boolean;
BEGIN
  v_admin := public.p3_resolve_admin_id(p_admin_id);

  SELECT * INTO v_sub
  FROM public.student_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.subscription_plans WHERE id = v_sub.plan_id
  ) INTO v_plan_exists;

  IF NOT v_plan_exists THEN
    RAISE EXCEPTION 'Subscription references an invalid plan' USING ERRCODE = 'P0002';
  END IF;

  IF v_sub.expires_at IS NOT NULL AND v_sub.expires_at <= now() THEN
    RAISE EXCEPTION 'Subscription has expired. Extend its expiry before activating.'
      USING ERRCODE = 'P0001';
  END IF;

  IF (v_sub.current_session_slots + v_sub.bonus_slots) <= 0 THEN
    RAISE EXCEPTION 'Subscription has no usable sessions left. Add sessions or create a fresh entitlement first.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_sub.status = 'active' THEN
    RETURN v_sub;
  END IF;

  UPDATE public.student_subscriptions
  SET status = 'active',
      cancelled_at = NULL,
      cancellation_reason = NULL,
      activated_at = COALESCE(activated_at, now()),
      updated_at = now()
  WHERE id = v_sub.id
  RETURNING * INTO v_sub;

  INSERT INTO public.subscription_slot_adjustments (
    student_id, subscription_id, admin_id, action,
    old_remaining_slots, new_remaining_slots,
    old_bonus_slots, new_bonus_slots,
    reason, metadata
  ) VALUES (
    v_sub.user_id, v_sub.id, v_admin, 'reactivate',
    v_sub.current_session_slots, v_sub.current_session_slots,
    v_sub.bonus_slots, v_sub.bonus_slots,
    COALESCE(NULLIF(p_reason, ''), 'Subscription activated by admin'),
    jsonb_build_object('admin_action', 'activate')
  );

  RETURN v_sub;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activate_subscription(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activate_subscription(uuid, text, uuid) TO service_role;

-- ============================================================
-- DEACTIVATE a student subscription (status -> cancelled).
-- Does NOT modify subscription_plans.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_deactivate_subscription(
  p_subscription_id uuid,
  p_reason text DEFAULT '',
  p_admin_id uuid DEFAULT NULL
)
RETURNS public.student_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_sub public.student_subscriptions;
  v_admin uuid;
BEGIN
  v_admin := public.p3_resolve_admin_id(p_admin_id);

  SELECT * INTO v_sub
  FROM public.student_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_sub.status <> 'active' THEN
    RETURN v_sub;
  END IF;

  UPDATE public.student_subscriptions
  SET status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = COALESCE(NULLIF(p_reason, ''), 'Deactivated by admin'),
      updated_at = now()
  WHERE id = v_sub.id
  RETURNING * INTO v_sub;

  INSERT INTO public.subscription_slot_adjustments (
    student_id, subscription_id, admin_id, action,
    old_remaining_slots, new_remaining_slots,
    old_bonus_slots, new_bonus_slots,
    reason, metadata
  ) VALUES (
    v_sub.user_id, v_sub.id, v_admin, 'suspend',
    v_sub.current_session_slots, v_sub.current_session_slots,
    v_sub.bonus_slots, v_sub.bonus_slots,
    COALESCE(NULLIF(p_reason, ''), 'Subscription deactivated by admin'),
    jsonb_build_object('admin_action', 'deactivate')
  );

  RETURN v_sub;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_deactivate_subscription(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_subscription(uuid, text, uuid) TO service_role;


-- ============================================================
-- ADD / REMOVE SESSIONS (atomic; rejects negative balance).
-- delta > 0 => ADD sessions (into the manual bonus bucket so the
--   purchased entitlement total_session_slots is preserved and the DB
--   constraint current <= total + bonus holds).
-- delta < 0 => REMOVE sessions (taken from the bonus bucket first,
--   then from the remaining balance).
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_adjust_sessions(
  p_subscription_id uuid,
  p_delta integer,
  p_reason text DEFAULT '',
  p_source text DEFAULT 'ADMIN_ADJUSTMENT',
  p_admin_id uuid DEFAULT NULL
)
RETURNS public.student_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_sub public.student_subscriptions;
  v_old_current integer;
  v_old_bonus integer;
  v_new_current integer;
  v_new_bonus integer;
  v_available_before integer;
  v_available_after integer;
  v_to_remove integer;
  v_from_bonus integer;
  v_admin uuid;
  v_action text;
BEGIN
  v_admin := public.p3_resolve_admin_id(p_admin_id);

  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'Session adjustment must be a non-zero amount' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_sub
  FROM public.student_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = 'P0002';
  END IF;

  v_old_current := v_sub.current_session_slots;
  v_old_bonus := v_sub.bonus_slots;
  v_available_before := v_old_current + v_old_bonus;
  v_new_current := v_old_current;
  v_new_bonus := v_old_bonus;

  IF p_delta > 0 THEN
    v_new_bonus := v_old_bonus + p_delta;
    v_action := 'increase_slots';
  ELSE
    v_to_remove := -p_delta;
    IF v_to_remove > v_available_before THEN
      RAISE EXCEPTION 'Cannot remove % session(s) from a usable balance of % (would go below zero).',
        v_to_remove, v_available_before
        USING ERRCODE = 'P0001';
    END IF;
    v_from_bonus := LEAST(v_old_bonus, v_to_remove);
    v_new_bonus := v_old_bonus - v_from_bonus;
    v_new_current := v_old_current - (v_to_remove - v_from_bonus);
    v_action := 'decrease_slots';
  END IF;

  UPDATE public.student_subscriptions
  SET current_session_slots = v_new_current,
      bonus_slots = v_new_bonus,
      updated_at = now()
  WHERE id = v_sub.id
  RETURNING * INTO v_sub;

  v_available_after := v_new_current + v_new_bonus;

  INSERT INTO public.subscription_slot_adjustments (
    student_id, subscription_id, admin_id, action,
    old_remaining_slots, new_remaining_slots,
    old_bonus_slots, new_bonus_slots,
    reason, metadata
  ) VALUES (
    v_sub.user_id, v_sub.id, v_admin, v_action,
    v_old_current, v_new_current,
    v_old_bonus, v_new_bonus,
    COALESCE(NULLIF(p_reason, ''), 'Session balance adjusted by admin'),
    jsonb_build_object(
      'delta', p_delta,
      'source', p_source,
      'available_before', v_available_before,
      'available_after', v_available_after
    )
  );

  RETURN v_sub;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_sessions(uuid, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_sessions(uuid, integer, text, text, uuid) TO service_role;


-- ============================================================
-- EXTEND EXPIRY (atomic, with audit)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_extend_expiry(
  p_subscription_id uuid,
  p_days integer,
  p_reason text DEFAULT '',
  p_admin_id uuid DEFAULT NULL
)
RETURNS public.student_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_sub public.student_subscriptions;
  v_old_expiry timestamptz;
  v_new_expiry timestamptz;
  v_admin uuid;
BEGIN
  v_admin := public.p3_resolve_admin_id(p_admin_id);

  IF p_days IS NULL OR p_days <= 0 THEN
    RAISE EXCEPTION 'Extension days must be a positive number' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_sub
  FROM public.student_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found' USING ERRCODE = 'P0002';
  END IF;

  v_old_expiry := v_sub.expires_at;
  v_new_expiry := COALESCE(v_sub.expires_at, now()) + make_interval(days => p_days);

  UPDATE public.student_subscriptions
  SET expires_at = v_new_expiry,
      updated_at = now()
  WHERE id = v_sub.id
  RETURNING * INTO v_sub;

  INSERT INTO public.subscription_slot_adjustments (
    student_id, subscription_id, admin_id, action,
    old_remaining_slots, new_remaining_slots,
    old_bonus_slots, new_bonus_slots,
    reason, metadata
  ) VALUES (
    v_sub.user_id, v_sub.id, v_admin, 'extend_expiry',
    v_sub.current_session_slots, v_sub.current_session_slots,
    v_sub.bonus_slots, v_sub.bonus_slots,
    COALESCE(NULLIF(p_reason, ''), 'Subscription expiry extended by admin'),
    jsonb_build_object(
      'old_expiry', v_old_expiry,
      'new_expiry', v_new_expiry,
      'days_added', p_days
    )
  );

  RETURN v_sub;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_extend_expiry(uuid, integer, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_extend_expiry(uuid, integer, text, uuid) TO service_role;
