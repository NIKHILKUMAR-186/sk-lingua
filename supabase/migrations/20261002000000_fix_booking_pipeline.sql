-- ============================================================
-- Fix: Booking pipeline (holds + booking atomic + availability consistency)
--
-- Idempotent (safe to re-run). Fixes:
--   1. booking_holds missing columns (student_id / released_at) that the
--      P6 RPCs reference but the P2 CREATE TABLE never added, because
--      P6 used CREATE TABLE IF NOT EXISTS => no-op on an existing table.
--   2. create_slot_hold "operator does not exist: integer || integer"
--      (code 42883): `(get_booking_rule('maximum_booking_days')::integer || 30)`
--      concatenated two integers. Replaced with COALESCE(...) + explicit.
--   3. create_slot_hold / create_booking_atomic interval math uses the
--      robust `n * interval '1 minute'` form (no integer||text fragility).
--   4. Availability weekday match is case-insensitive and locale-agnostic
--      so 'tuesday' always matches a stored 'Tuesday'/'TUESDAY'.
--   5. Race-safety: unique guard so two students cannot both book/hold the
--      same (mentor, slot start) concurrently.
-- ============================================================

-- ============================================================
-- 1. Ensure booking_holds has the columns the P6 RPCs expect.
-- ============================================================
ALTER TABLE public.booking_holds
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS released_at timestamptz;

-- If a legacy FK on booking_id pointed at session_requests, repoint to sessions.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    WHERE c.contype = 'f'
      AND rel.relname = 'booking_holds'
      AND c.confrelid = 'public.session_requests'::regclass
  ) THEN
    ALTER TABLE public.booking_holds DROP CONSTRAINT IF EXISTS booking_holds_booking_id_fkey;
    ALTER TABLE public.booking_holds
      ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- 2. Race-safety: one active hold per (mentor, scheduled slot).
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'booking_holds_active_slot_unique'
  ) THEN
    CREATE UNIQUE INDEX booking_holds_active_slot_unique
      ON public.booking_holds (mentor_id, scheduled_time)
      WHERE status = 'active' AND expires_at > now();
  END IF;
END $$;

-- ============================================================
-- 3. Race-safety: one confirmed session per (mentor, slot).
--    Only created if no duplicate active bookings already exist.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uq_sessions_mentor_slot_active'
  ) THEN
    IF (SELECT COUNT(*) FROM (
      SELECT mentor_id, scheduled_time
      FROM public.sessions
      WHERE status NOT IN ('cancelled', 'rejected')
      GROUP BY mentor_id, scheduled_time
      HAVING count(*) > 1
    ) t) = 0 THEN
      CREATE UNIQUE INDEX uq_sessions_mentor_slot_active
        ON public.sessions (mentor_id, scheduled_time)
                WHERE status NOT IN ('cancelled', 'rejected');
    END IF;
  END IF;
END $$;

-- ============================================================
-- 4. RPC: create_slot_hold  (FIXED: integer||integer -> COALESCE)
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
  v_max_days integer;
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

  -- 3. Maximum advance booking window (rules-driven, fallback 30 days)
  v_max_days := COALESCE((get_booking_rule('maximum_booking_days'))::integer, 30);
  IF p_scheduled_start > now() + v_max_days * interval '1 day' THEN
    RAISE EXCEPTION 'Booking rejected.' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Slot must belong to the mentor's P4 availability (mentor-local weekday)
  IF NOT EXISTS (
    SELECT 1 FROM public.availability_slots a
    WHERE a.mentor_id = p_mentor_id
      AND a.is_available <> false
      AND a.start_time =
          (p_scheduled_start AT TIME ZONE COALESCE(a.timezone, 'UTC'))::time
      AND lower(trim(to_char(
            p_scheduled_start AT TIME ZONE COALESCE(a.timezone, 'UTC'),
            'Day')))
          = lower(trim(a.day_of_week))
  ) THEN
    RAISE EXCEPTION 'Slot is no longer available.' USING ERRCODE = 'P0001';
  END IF;

  -- 5. No active booking already occupying this mentor+slot
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

  -- 6. No conflicting active hold by another student
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

  -- 7. Release any existing active holds for THIS student on this slot
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
    now() + p_hold_minutes * interval '1 minute'
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
-- 5. RPC: release_slot_hold
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
    AND expires_at > now()
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
-- 6. RPC: cleanup_expired_holds
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
-- 7. RPC: validate_hold_for_booking
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
-- 8. RPC: create_booking_atomic  (fixed interval math + case-insensitive
--    availability weekday match + hold consumed with booking_id link)
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
  v_max_days   := COALESCE((get_booking_rule('maximum_booking_days'))::integer, 30);

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
  IF p_scheduled_start < now() + v_min_notice * interval '1 minute' THEN
    RAISE EXCEPTION 'BOOKING_NOTICE_VIOLATION' USING ERRCODE = 'P0001';
  END IF;

  -- 7. Maximum advance booking window
  IF p_scheduled_start > now() + v_max_days * interval '1 day' THEN
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
      AND lower(trim(to_char(
            p_scheduled_start AT TIME ZONE COALESCE(a.timezone, 'UTC'),
            'Day')))
          = lower(trim(a.day_of_week))
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

    -- Mark hold as consumed, linking it to the new session
    UPDATE public.booking_holds
    SET status = 'booked', released_at = now()
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

  -- Link the consumed hold (if any) to the new session.
  IF p_hold_id IS NOT NULL THEN
    UPDATE public.booking_holds
    SET booking_id = v_booking.id
    WHERE id = p_hold_id;
  END IF;

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
  IS 'P6+: atomically reserves a mentor slot. Validates active mentor, active+unexpired subscription, future P4 availability slot, minimum notice, maximum advance window, session balance, and slot uniqueness (race-safe). Optionally consumes a verified slot hold.';



