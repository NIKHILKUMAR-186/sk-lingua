-- ============================================================
-- P5: STUDENT SLOT BOOKING (atomic)
-- ============================================================
-- Reuses the existing booking record table (public.sessions) and
-- the existing P4 availability engine (public.availability_slots),
-- the existing subscription/session wallet (public.student_subscriptions)
-- and the existing automatic consumption ledger
-- (public.subscription_usage_logs).
--
-- NO Gig / Service dependency: bookings are created with gig_id = NULL.
-- NO new parallel balance system: the authoritative balance remains
-- student_subscriptions.(current_session_slots + bonus_slots).
--
-- The booking + session deduction + ledger entry happen inside ONE
-- SECURITY DEFINER transaction (create_booking_atomic), protected by a
-- partial UNIQUE index on sessions(mentor_id, scheduled_time) so that a
-- mentor can never have two active bookings for the exact same slot.
-- ============================================================

-- ============================================================
-- 1. Link bookings to the subscription that funded the session
-- ============================================================
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS subscription_id uuid
    REFERENCES public.student_subscriptions(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.sessions.subscription_id
  IS 'P5: the student subscription that funded this booked session.';

CREATE INDEX IF NOT EXISTS idx_sessions_subscription_id
  ON public.sessions (subscription_id);

-- ============================================================
-- 2. Database-enforced uniqueness of mentor + exact slot
-- ============================================================
-- A mentor cannot have two "live" (non-terminal) bookings for the exact
-- same scheduled_start. Cancelled / rejected bookings are excluded so a
-- slot becomes bookable again after being released. This is the
-- authoritative concurrency guard (not a JS check).
CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_mentor_slot_nonterminal
  ON public.sessions (mentor_id, scheduled_time)
  WHERE status NOT IN ('cancelled', 'rejected');

CREATE INDEX IF NOT EXISTS idx_sessions_mentor_scheduled
  ON public.sessions (mentor_id, scheduled_time);

-- ============================================================
-- 3. ATOMIC booking / session-deduction / ledger RPC
-- ============================================================
-- The student is resolved from the authenticated Supabase session
-- (auth.uid()); the client can never choose who gets charged.
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_mentor_id uuid,
  p_scheduled_start timestamptz,
  p_duration_mins integer DEFAULT 30
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
  v_old_current integer;
  v_old_bonus   integer;
  v_old_used    integer;
  v_new_current integer;
  v_new_bonus   integer;
  v_booking     public.sessions;
BEGIN
  -- 1. Resolve the authenticated student (server-side only)
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_mentor_id IS NULL OR p_scheduled_start IS NULL THEN
    RAISE EXCEPTION 'Booking rejected.' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Validate the mentor exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.mentor_profiles
    WHERE user_id = p_mentor_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Booking rejected.' USING ERRCODE = 'P0001';
  END IF;

  -- 3. Find the active subscription
  SELECT * INTO v_sub
  FROM public.get_current_student_subscription(v_student_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You don''t have an active subscription.' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Verify not expired (belt & braces)
  IF v_sub.expires_at IS NOT NULL AND v_sub.expires_at < now() THEN
    RAISE EXCEPTION 'Your subscription has expired.' USING ERRCODE = 'P0001';
  END IF;

  -- 5. A slot that has already started/passed cannot be booked.
  --    Uses the DB clock, never the browser clock.
  IF p_scheduled_start <= now() THEN
    RAISE EXCEPTION 'Booking rejected.' USING ERRCODE = 'P0001';
  END IF;

  -- 6. Validate the slot belongs to this mentor's P4 availability and is
  --    available. Converts the absolute timestamp into the slot's own
  --    timezone and matches day_of_week + start_time.
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
    RAISE EXCEPTION 'Booking rejected.' USING ERRCODE = 'P0001';
  END IF;

  -- 7. Friendly pre-check for an already-booked slot (the authoritative
  --    guard is the partial unique index below; this only improves the msg).
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

  -- 8. Lock the subscription row to serialize concurrent deductions on the
  --    SAME subscription (e.g. double-click) and re-validate the balance.
  SELECT * INTO v_sub
  FROM public.student_subscriptions
  WHERE id = v_sub.id
  FOR UPDATE;

  v_available := v_sub.current_session_slots + v_sub.bonus_slots;
  IF v_available <= 0 THEN
    RAISE EXCEPTION 'You have no sessions remaining.' USING ERRCODE = 'P0001';
  END IF;

  v_old_current := v_sub.current_session_slots;
  v_old_bonus   := v_sub.bonus_slots;
  v_old_used    := COALESCE(v_sub.used_session_slots, 0);

  -- 9. Deduct EXACTLY one session (regular slots first, then bonus).
  IF v_sub.current_session_slots > 0 THEN
    v_new_current := v_sub.current_session_slots - 1;
    v_new_bonus   := v_sub.bonus_slots;
  ELSE
    v_new_current := v_sub.current_session_slots;
    v_new_bonus   := v_sub.bonus_slots - 1;
  END IF;

  UPDATE public.student_subscriptions
  SET current_session_slots = v_new_current,
      bonus_slots           = v_new_bonus,
      used_session_slots    = v_old_used + 1,
      updated_at            = now()
  WHERE id = v_sub.id;

  -- 10. Create the booking (CONFIRMED status, NO gig dependency).
  INSERT INTO public.sessions (
    student_id, mentor_id, subscription_id,
    scheduled_time, duration_mins, status
  )
  VALUES (
    v_student_id, p_mentor_id, v_sub.id,
    p_scheduled_start, p_duration_mins, 'confirmed'
  )
  RETURNING * INTO v_booking;

  -- 11. Exactly one ledger entry (source = BOOKING) in the existing
  --     automatic-consumption ledger.
  INSERT INTO public.subscription_usage_logs (
    student_id, subscription_id, session_id, action, slots_consumed,
    old_remaining_slots, new_remaining_slots,
    old_used_slots, new_used_slots,
    session_status, metadata
  )
  VALUES (
    v_student_id, v_sub.id, v_booking.id, 'session_booked', 1,
    v_old_current + v_old_bonus,
    v_sub.current_session_slots + v_sub.bonus_slots,
    v_old_used, v_sub.used_session_slots,
    'confirmed',
    jsonb_build_object(
      'source', 'BOOKING',
      'booking_id', v_booking.id,
      'reason', 'Session booked'
    )
  );

  -- 12. Return the booking (transaction commits here).
  RETURN v_booking;

EXCEPTION
  WHEN unique_violation THEN
    -- Two students raced for the same mentor+slot: only one wins.
    RAISE EXCEPTION
      'This slot was just booked by another student. Please choose another time.'
      USING ERRCODE = 'P0001';
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid, timestamptz, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid, timestamptz, integer)
  TO service_role;

COMMENT ON FUNCTION public.create_booking_atomic(uuid, timestamptz, integer)
  IS 'P5: atomically books a mentor slot, deducts exactly one session from the '
     'student''s active subscription, and appends one ledger entry. Rolls back '
     'fully on any validation or concurrency failure.';



