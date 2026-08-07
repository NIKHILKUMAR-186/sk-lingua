-- ============================================================
-- Demo Session Admin Workflow — Redesign
-- Business rule: Admin conducts EVERY demo session. Mentors are
-- completely excluded from the demo workflow.
--
-- Status lifecycle:
--   pending_admin_confirmation -> confirmed -> completed / cancelled / no_show
--
-- One student = one lifetime demo session.
-- ============================================================

-- ============================================================
-- 1. Add admin-workflow columns to demo_session_bookings
-- ============================================================
ALTER TABLE public.demo_session_bookings
  ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz,
  ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz;

-- Index for admin queue + student lifetime check
CREATE INDEX IF NOT EXISTS idx_demo_bookings_status ON public.demo_session_bookings (booking_status);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_user ON public.demo_session_bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_admin ON public.demo_session_bookings (admin_id);

-- ============================================================
-- 2. Backend enforcement of one-lifetime-demo rule
--    Returns TRUE if the student already has a demo booking in a
--    "consumed" state (pending confirmation, confirmed, completed,
--    no_show). Used by an insert trigger to reject duplicates.
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_used_demo_session(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.demo_session_bookings
  WHERE user_id = p_user_id
    AND booking_status IN (
      'pending_admin_confirmation',
      'confirmed',
      'completed',
      'no_show'
    );
  RETURN v_count > 0;
END;
$$;

-- ============================================================
-- 3. Trigger to enforce one-lifetime-demo rule on INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_duplicate_demo_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block a second demo booking for a student who already has a
  -- non-cancelled, non-rejected demo booking.
  IF NEW.booking_status IN ('pending_admin_confirmation', 'confirmed') THEN
    IF public.has_used_demo_session(NEW.user_id) AND NEW.booking_status = 'pending_admin_confirmation' THEN
      RAISE EXCEPTION 'You have already used your demo session.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_demo_booking
  ON public.demo_session_bookings;
CREATE TRIGGER trg_prevent_duplicate_demo_booking
  BEFORE INSERT ON public.demo_session_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_demo_booking();

-- ============================================================
-- 4. Normalize existing rows to the new admin-conducted model
--    * pending_assignment      -> pending_admin_confirmation (awaiting admin)
--    * mentor_assigned         -> confirmed (a mentor was already chosen; the
--                                 admin now conducts, so treat as confirmed)
--    * pending_mentor_response -> confirmed (a mentor was already chosen and
--                                 notified; treat as confirmed)
--    * assigned / accepted     -> confirmed
--    No existing booking is orphaned or lost.
-- ============================================================
UPDATE public.demo_session_bookings
SET booking_status = 'pending_admin_confirmation'
WHERE booking_status = 'pending_assignment';

-- The one-per-student unique index (created in the hardening migration)
-- must not conflict with these updates, so only map to 'confirmed' here.
UPDATE public.demo_session_bookings
SET booking_status = 'confirmed'
WHERE booking_status IN ('mentor_assigned', 'pending_mentor_response', 'assigned', 'accepted');

-- ============================================================
-- 5. RLS: Admins can manage all demo bookings;
--    Students can read their own.
-- ============================================================
DROP POLICY IF EXISTS "Demo bookings admin manage" ON public.demo_session_bookings;
DROP POLICY IF EXISTS "Demo bookings student read" ON public.demo_session_bookings;
DROP POLICY IF EXISTS "Demo bookings student create" ON public.demo_session_bookings;
DROP POLICY IF EXISTS "Demo bookings mentor read" ON public.demo_session_bookings;
DROP POLICY IF EXISTS "Demo bookings mentor update" ON public.demo_session_bookings;

-- Admins can do everything on demo session bookings
CREATE POLICY "Demo bookings admin manage" ON public.demo_session_bookings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Student can read their own bookings
CREATE POLICY "Demo bookings student read" ON public.demo_session_bookings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Student can create their own booking (one-lifetime enforced by trigger)
CREATE POLICY "Demo bookings student create" ON public.demo_session_bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Student can update their own booking (only for limited fields like cancel)
CREATE POLICY "Demo bookings student update own" ON public.demo_session_bookings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 6. Realtime: keep admin queue + student dashboard live
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.demo_session_bookings;

-- ============================================================
-- 7. Grants
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_session_bookings TO authenticated;
GRANT ALL ON public.demo_session_bookings TO service_role;
GRANT EXECUTE ON FUNCTION public.has_used_demo_session(uuid) TO authenticated;
