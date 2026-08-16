-- ============================================================
-- P6: Production-Ready Smart Booking System
-- ============================================================
-- Adds:
--   - booking_rules table (centralized configurable booking rules)
--   - booking_holds table (temporary slot reservations)
--   - RPCs for hold creation, release, cleanup
--   - Enhanced create_booking_atomic with hold + rules validation
--   - Auto-cleanup trigger for expired holds
--   - booking_config key-value store for runtime overrides
-- ============================================================

-- ============================================================
-- 1. Booking Rules (centralized configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_rules TO authenticated;
GRANT ALL ON public.booking_rules TO service_role;

ALTER TABLE public.booking_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_rules_admin_manage"
  ON public.booking_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "booking_rules_read_all"
  ON public.booking_rules
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_booking_rules_updated
  BEFORE UPDATE ON public.booking_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default booking rules (idempotent)
INSERT INTO public.booking_rules (key, value, description) VALUES
  ('session_duration_minutes', '30', 'Default session duration in minutes'),
  ('minimum_booking_notice_minutes', '30', 'Minimum minutes before a slot can be booked'),
  ('maximum_booking_days', '30', 'Maximum days in advance a slot can be booked'),
  ('slot_hold_minutes', '10', 'Duration of temporary slot hold in minutes'),
  ('cancellation_window_minutes', '60', 'Minimum minutes before session to allow cancellation'),
  ('same_day_booking_enabled', 'true', 'Whether same-day booking is allowed')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. Booking Holds (temporary slot reservations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_time timestamptz NOT NULL,
  duration_mins integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  booking_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_holds TO authenticated;
GRANT ALL ON public.booking_holds TO service_role;

ALTER TABLE public.booking_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_holds_student_manage"
  ON public.booking_holds
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "booking_holds_admin_manage"
  ON public.booking_holds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "booking_holds_service_manage"
  ON public.booking_holds
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for fast lookup of active holds
CREATE INDEX IF NOT EXISTS idx_booking_holds_mentor_slot_active
  ON public.booking_holds (mentor_id, scheduled_time)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_booking_holds_student
  ON public.booking_holds (student_id);

CREATE INDEX IF NOT EXISTS idx_booking_holds_expires
  ON public.booking_holds (expires_at)
  WHERE status = 'active';

-- Trigger for updated_at
CREATE TRIGGER trg_booking_holds_updated
  BEFORE UPDATE ON public.booking_holds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Auto-cleanup of expired holds (background hygiene)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.booking_holds
  SET status = 'expired', released_at = now()
  WHERE status = 'active'
    AND expires_at <= now()
    AND booking_id IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_holds() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_holds() TO service_role;

-- ============================================================
-- 4. RPC: Create a slot hold
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_slot_hold(
  p_mentor_id uuid,
  p_scheduled_start timestamptz,
  p_duration_mins integer DEFAULT 30,
  p_hold_minutes integer DEFAULT 10
)
RETURNS public.booking_holds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_student_id uuid;
  v_hold public.booking_holds;
  v_conflict_count integer;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- 1. Mentor must be active
  IF NOT EXISTS (
    SELECT 1 FROM public.mentor_profiles
    WHERE user_id = p_mentor_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Booking rejected.' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Slot must not be in the past
  IF p_scheduled_start <= now() THEN
    RAISE EXCEPTION 'Booking rejected.' USING ERRCODE = 'P0001';
  END IF;

  -- 3. Check booking rules: maximum advance window
  IF p_scheduled_start > now() + (get_booking_rule('maximum_booking_days')::integer || 30) * interval '1 day' THEN
    RAISE EXCEPTION 'Booking rejected.' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Slot must belong to mentor's availability
  IF NOT EXISTS (
    SELECT 1 FROM public.availability_slots a
    WHERE a.mentor_id = p_mentor_id
      AND a.is_available <> false
      AND a.start_time =
          (p_scheduled_start AT TIME ZONE COALESCE(a.timezone, 'UTC'))::time
      AND lower(to_char(
            p_scheduled_start AT TIME ZONE COALESCE(a.timezone, 'UTC'),
            'FMDay'))
          = a.day_of_week
  ) THEN
    RAISE EXCEPTION 'Slot is no longer available.' USING ERRCODE = 'P0001';
  END IF;

  -- 5. Check no active booking for this mentor+slot
  IF EXISTS (
    SELECT 1 FROM public.sessions
    WHERE mentor_id = p_mentor_id
      AND scheduled_time = p_scheduled_start
      AND status NOT IN ('cancelled', 'rejected')
  ) THEN
    RAISE EXCEPTION
      'This slot was just booked by another student. Please choose another time.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 6. Check no conflicting active hold
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.booking_holds
  WHERE mentor_id = p_mentor_id
    AND scheduled_time = p_scheduled_start
    AND status = 'active'
    AND expires_at > now()
    AND student_id <> v_student_id;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION
      'This slot was just held by another student. Please choose another time.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 7. Release any existing active holds for this student on this slot
  UPDATE public.booking_holds
  SET status = 'released', released_at = now()
  WHERE student_id = v_student_id
    AND scheduled_time = p_scheduled_start
    AND status = 'active'
    AND expires_at > now();

  -- 8. Create the hold
  INSERT INTO public.booking_holds (
    mentor_id, student_id, scheduled_time, duration_mins, expires_at
  ) VALUES (
    p_mentor_id, v_student_id, p_scheduled_start, p_duration_mins,
    now() + (p_hold_minutes || ' minutes')::interval
  )
  RETURNING * INTO v_hold;

  RETURN v_hold;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION
      'This slot was just booked by another student. Please choose another time.'
      USING ERRCODE = 'P0001';
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_slot_hold(uuid, timestamptz, integer, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_slot_hold(uuid, timestamptz, integer, integer)
  TO service_role;

-- ============================================================
-- 5. RPC: Release a slot hold
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_slot_hold(
  p_hold_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_student_id uuid;
  v_hold public.booking_holds;
BEGIN
  v_student_id := auth.uid();

  SELECT * INTO v_hold
  FROM public.booking_holds
  WHERE id = p_hold_id
    AND student_id = v_student_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.booking_holds
  SET status = 'released', released_at = now()
  WHERE id = p_hold_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_slot_hold(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_slot_hold(uuid) TO service_role;

-- ============================================================
-- 6. RPC: Get booking rule value
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_booking_rule(
  p_key text
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.booking_rules
  WHERE key = p_key
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_rule(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_rule(text) TO service_role;

-- ============================================================
-- 7. RPC: Get all booking rules (for admin/server use)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_all_booking_rules()
RETURNS TABLE (
  key text,
  value text,
  description text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT key, value, description, updated_at
  FROM public.booking_rules
  ORDER BY key;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_booking_rules() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_booking_rules() TO service_role;

-- ============================================================
-- 8. RPC: Validate a hold for booking
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_hold_for_booking(
  p_hold_id uuid,
  p_student_id uuid
)
RETURNS public.booking_holds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_hold public.booking_holds;
BEGIN
  SELECT * INTO v_hold
  FROM public.booking_holds
  WHERE id = p_hold_id
    AND student_id = p_student_id
    AND status = 'active'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SLOT_HOLD_EXPIRED' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_hold;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_hold_for_booking(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_hold_for_booking(uuid, uuid) TO service_role;

-- ============================================================
-- 9. Enhanced create_booking_atomic with hold + booking rules
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_mentor_id uuid,
  p_scheduled_start timestamptz,
  p_duration_mins integer DEFAULT 30,
  p_hold_id uuid DEFAULT NULL
)
RETURNS public.sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_student_id uuid;
  v_sub        public.student_subscriptions;
  v_available  integer;
  v_hold       public.booking_holds;
  v_booking    public.sessions;
  v_min_notice integer;
  v_max_days   integer;
BEGIN
  -- 1. Resolve the authenticated student
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_mentor_id IS NULL OR p_scheduled_start IS NULL THEN
    RAISE EXCEPTION 'Booking rejected.' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Get booking rules
  v_min_notice := COALESCE((get_booking_rule('minimum_booking_notice_minutes'))::integer, 30);
  v_max_days := COALESCE((get_booking_rule('maximum_booking_days'))::integer, 30);

  -- 3. Validate mentor exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.mentor_profiles
    WHERE user_id = p_mentor_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'MENTOR_INACTIVE' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Find the active subscription
  SELECT * INTO v_sub
  FROM public.get_current_student_subscription(v_student_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You don''t have an active subscription.' USING ERRCODE = 'P0001';
  END IF;

  -- 5. Verify not expired
  IF v_sub.expires_at IS NOT NULL AND v_sub.expires_at < now() THEN
    RAISE EXCEPTION 'Your subscription has expired.' USING ERRCODE = 'P0001';
  END IF;

  -- 6. Minimum booking notice
  IF p_scheduled_start < now() + (v_min_notice || ' minutes')::interval THEN
    RAISE EXCEPTION 'BOOKING_NOTICE_VIOLATION' USING ERRCODE = 'P0001';
  END IF;

  -- 7. Maximum advance booking window
  IF p_scheduled_start > now() + (v_max_days || ' days')::interval THEN
    RAISE EXCEPTION 'BOOKING_WINDOW_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  -- 8. Slot must not have already started/passed
  IF p_scheduled_start <= now() THEN
    RAISE EXCEPTION 'Booking rejected.' USING ERRCODE = 'P0001';
  END IF;

  -- 9. Validate the slot belongs to this mentor's P4 availability
  IF NOT EXISTS (
    SELECT 1 FROM public.availability_slots a
    WHERE a.mentor_id = p_mentor_id
      AND a.is_available <> false
      AND a.start_time =
          (p_scheduled_start AT TIME ZONE COALESCE(a.timezone, 'UTC'))::time
      AND lower(to_char(
            p_scheduled_start AT TIME ZONE COALESCE(a.timezone, 'UTC'),
            'FMDay'))
          = a.day_of_week
  ) THEN
    RAISE EXCEPTION 'SLOT_NO_LONGER_AVAILABLE' USING ERRCODE = 'P0001';
  END IF;

  -- 10. If a hold_id is provided, validate it
  IF p_hold_id IS NOT NULL THEN
    SELECT * INTO v_hold
    FROM public.booking_holds
    WHERE id = p_hold_id
      AND student_id = v_student_id
      AND mentor_id = p_mentor_id
      AND scheduled_time = p_scheduled_start
      AND status = 'active'
      AND expires_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SLOT_HOLD_EXPIRED' USING ERRCODE = 'P0001';
    END IF;

    -- Mark hold as consumed
    UPDATE public.booking_holds
    SET status = 'booked', booking_id = NULL, released_at = now()
    WHERE id = p_hold_id;
  END IF;

  -- 11. Friendly pre-check for an already-booked slot
  IF EXISTS (
    SELECT 1 FROM public.sessions
    WHERE mentor_id = p_mentor_id
      AND scheduled_time = p_scheduled_start
      AND status NOT IN ('cancelled', 'rejected')
  ) THEN
    RAISE EXCEPTION
      'This slot was just booked by another student. Please choose another time.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 12. Soft balance pre-check
  v_available := v_sub.current_session_slots + v_sub.bonus_slots;
  IF v_available <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_SESSIONS' USING ERRCODE = 'P0001';
  END IF;

  -- 13. Reserve the slot
  INSERT INTO public.sessions (
    student_id, mentor_id, subscription_id,
    scheduled_time, duration_mins, status
  )
  VALUES (
    v_student_id, p_mentor_id, v_sub.id,
    p_scheduled_start, p_duration_mins, 'confirmed'
  )
  RETURNING * INTO v_booking;

  RETURN v_booking;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION
      'This slot was just booked by another student. Please choose another time.'
      USING ERRCODE = 'P0001';
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid, timestamptz, integer, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid, timestamptz, integer, uuid)
  TO service_role;

COMMENT ON FUNCTION public.create_booking_atomic(uuid, timestamptz, integer, uuid)
  IS 'P6: reserves a mentor slot with booking rules and optional hold validation. Validates active mentor, active+unexpired subscription, future P4 slot, balance, minimum notice, maximum advance window, and slot uniqueness via uq_sessions_mentor_slot_nonterminal.';

-- ============================================================
-- 10. Schedule periodic cleanup of expired holds
-- ============================================================
-- Note: In production, use a cron job or Supabase scheduled function
-- For now, we clean up on each hold creation and booking attempt
