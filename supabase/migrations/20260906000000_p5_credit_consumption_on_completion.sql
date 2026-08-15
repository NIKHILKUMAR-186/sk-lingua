-- P5: reserve at booking, consume the credit at completion.
-- 1) create_booking_atomic no longer deducts a session / writes a ledger at
--    booking — booking is RESERVE-only (status='confirmed'). The existing
--    trg_log_session_completion trigger consumes exactly one credit + writes
--    one ledger row, exactly once (its WHEN clause), when status -> 'completed'.
--    This removes the double-deduct + duplicate-ledger that happened when
--    booking wrote a 'session_booked' log for the same session_id as the later
--    'session_completed' log.
-- 2) sessions UPDATE policy: a student may cancel but never set 'completed';
--    only the mentor (or admin) may complete a session.

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

  -- 3. Find the active subscription (server-side helper)
  SELECT * INTO v_sub
  FROM public.get_current_student_subscription(v_student_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You don''t have an active subscription.' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Verify not expired (belt & braces)
  IF v_sub.expires_at IS NOT NULL AND v_sub.expires_at < now() THEN
    RAISE EXCEPTION 'Your subscription has expired.' USING ERRCODE = 'P0001';
  END IF;

  -- 5. A slot that has already started / passed cannot be booked (DB clock)
  IF p_scheduled_start <= now() THEN
    RAISE EXCEPTION 'Booking rejected.' USING ERRCODE = 'P0001';
  END IF;

  -- 6. Validate the slot belongs to this mentor's P4 availability
  --    (matches the slot timezone + day_of_week + start_time)
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

  -- 7. Friendly pre-check for an already-booked slot (the authoritative
  --    guard is uq_sessions_mentor_slot_nonterminal; this only improves the msg).
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

  -- 8. Soft balance pre-check (eligibility only — NO deduction here).
  --    Consumption happens later, at completion, in trg_log_session_completion.
  v_available := v_sub.current_session_slots + v_sub.bonus_slots;
  IF v_available <= 0 THEN
    RAISE EXCEPTION 'You have no sessions remaining.' USING ERRCODE = 'P0001';
  END IF;

  -- 9. Reserve the slot. status = 'confirmed'; no gig/service dependency.
  --    NO subscription credit is consumed here.
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

GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid, timestamptz, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid, timestamptz, integer)
  TO service_role;

COMMENT ON FUNCTION public.create_booking_atomic(uuid, timestamptz, integer)
  IS 'P5: reserves a mentor slot (reserve-only). Does NOT consume a credit — that happens once at completion via trg_log_session_completion. Validates active mentor, active+unexpired subscription, future P4 slot, balance, and slot uniqueness via uq_sessions_mentor_slot_nonterminal.';

-- Harden sessions UPDATE (Rule 47): student may cancel but never complete.
DROP POLICY IF EXISTS "Participants update sessions" ON public.sessions;
CREATE POLICY "Participants update sessions" ON public.sessions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.uid() = mentor_id
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR auth.uid() = mentor_id
    OR (auth.uid() = student_id AND status IS DISTINCT FROM 'completed')
  );
COMMENT ON POLICY "Participants update sessions" ON public.sessions IS
  'P5: a student can update their own session (e.g. cancel) but never to completed; only the mentor (or an admin) may complete a session.';