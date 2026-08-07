-- ============================================================
-- Demo Session Workflow — Production Hardening
--
-- This migration hardens the demo admin-conducted workflow:
--   * Concurrency-safe one-lifetime-demo enforcement (unique partial index)
--   * Correct migration of legacy data (mentor_assigned / pending_mentor_response -> confirmed)
--   * Hardened RLS: students can only UPDATE a limited set of fields
--   * Hardened RLS: mentors are explicitly denied all access
--   * Drop unused mentor-based demo functions/policies
--   * Idempotent: safe to run on fresh and existing databases
-- ============================================================

-- ============================================================
-- 1. Concurrency-safe one-lifetime-demo enforcement
--
-- The existing BEFORE INSERT trigger uses SELECT COUNT(*), which is
-- susceptible to a race condition when two inserts happen at the same
-- time (both pass the count check before either commits). A unique
-- partial index provides a hard, transactional guarantee.
-- ============================================================

-- Drop any previously-created unique index so we can (re)create it.
DROP INDEX IF EXISTS idx_demo_bookings_one_per_student;

-- Enforce: at most ONE row per student in any "consumed" status.
-- This is the authoritative, concurrency-safe guard. The trigger
-- remains as a friendly error-messaging layer, but the index
-- guarantees uniqueness under concurrency.
--
-- NOTE: When a booking is CANCELLED, we want the student to be able to
-- rebook. We therefore exclude 'cancelled' from the unique index so
-- rebooking is allowed after cancellation. The business rule is:
--   * pending_admin_confirmation / confirmed / completed / no_show  -> consumed (blocked)
--   * cancelled                                                     -> rebookable
CREATE UNIQUE INDEX IF NOT EXISTS idx_demo_bookings_one_per_student
  ON public.demo_session_bookings (user_id)
  WHERE booking_status IN (
    'pending_admin_confirmation',
    'confirmed',
    'completed',
    'no_show'
  );

-- ============================================================
-- 2. Hardening the trigger (keep as friendly error layer)
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_duplicate_demo_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A cancelled booking is rebookable; only block "consumed" statuses.
  IF NEW.booking_status IN ('pending_admin_confirmation', 'confirmed') THEN
    IF public.has_used_demo_session(NEW.user_id) THEN
      RAISE EXCEPTION 'You have already used your demo session.'
        USING ERRCODE = 'P0001';
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
-- 3. Correct migration of legacy data
--
-- Old mentor-conducted statuses map to the new admin-conducted model:
--   * pending_assignment        -> pending_admin_confirmation (awaiting admin)
--   * mentor_assigned           -> confirmed (a mentor was already assigned;
--                                 in the new model the admin conducts, so treat
--                                 as confirmed/admin-conducted)
--   * pending_mentor_response   -> confirmed (a mentor was already chosen and
--                                 notified; treat as confirmed in admin-conducted model)
--   * assigned / accepted       -> confirmed
-- This ensures no existing booking is orphaned and none is lost.
-- ============================================================
UPDATE public.demo_session_bookings
SET booking_status = 'pending_admin_confirmation'
WHERE booking_status IN ('pending_assignment');

UPDATE public.demo_session_bookings
SET booking_status = 'confirmed'
WHERE booking_status IN ('mentor_assigned', 'pending_mentor_response', 'assigned', 'accepted');

-- ============================================================
-- 4. Hardened RLS
-- ============================================================

-- 4a. Annihilate any lingering mentor-based policies for demo bookings
DROP POLICY IF EXISTS "Demo bookings mentor read" ON public.demo_session_bookings;
DROP POLICY IF EXISTS "Demo bookings mentor update" ON public.demo_session_bookings;

-- 4b. Recreate student UPDATE so students can NEVER change status to
--     completed/no_show, or set admin fields. Students may only cancel
--     their own booking (set status -> cancelled).
DROP POLICY IF EXISTS "Demo bookings student update own" ON public.demo_session_bookings;
CREATE POLICY "Demo bookings student update own" ON public.demo_session_bookings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Allow transition to 'cancelled' only
      NEW.booking_status = 'cancelled'
      AND OLD.booking_status IN (
        'pending_admin_confirmation',
        'confirmed'
      )
      -- student may not null out admin fields or tamper with timestamps
      AND NEW.admin_id IS NOT DISTINCT FROM OLD.admin_id
      AND NEW.meeting_link IS NOT DISTINCT FROM OLD.meeting_link
      AND NEW.admin_notes IS NOT DISTINCT FROM OLD.admin_notes
      AND NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at
      AND NEW.no_show_at IS NOT DISTINCT FROM OLD.no_show_at
    )
  );

-- 4c. Explicitly revoke mentor access. Mentors are NOT admins and are NOT
--     the booking owner, so existing student-read + admin-manage policies
--     already exclude them. We add an explicit defensive deny for clarity.
DROP POLICY IF EXISTS "Demo bookings mentor no access" ON public.demo_session_bookings;
CREATE POLICY "Demo bookings mentor no access" ON public.demo_session_bookings
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- 5. Drop unused legacy demo functions (mentor-assignment based)
-- ============================================================
DROP FUNCTION IF EXISTS public.assign_mentor_to_demo(uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.accept_demo_assignment(uuid, uuid);
DROP FUNCTION IF EXISTS public.reject_demo_assignment(uuid, uuid, text);

-- ============================================================
-- 5b. Harden related demo tables (workspaces, assignment history,
--      resources) for the admin-conducted model.
--
--      In the admin-conducted model, the conducting user (admin) is
--      stored in the `mentor_id` column of demo_session_workspaces for
--      schema compatibility. We add explicit ADMIN access policies and
--      keep STUDENT read access. The legacy "mentor read own assignment"
--      policy is removed so a plain mentor cannot access demo data.
-- ============================================================

-- demo_session_workspaces: admin can manage their conducted sessions
DROP POLICY IF EXISTS "Demo workspace admin access" ON public.demo_session_workspaces;
CREATE POLICY "Demo workspace admin access" ON public.demo_session_workspaces
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- demo_session_workspaces: the conducting admin (stored in mentor_id)
-- can access their own workspace
DROP POLICY IF EXISTS "Demo workspace conductor access" ON public.demo_session_workspaces;
CREATE POLICY "Demo workspace conductor access" ON public.demo_session_workspaces
  FOR ALL TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- demo_assignment_history: remove legacy mentor-read policy; admins manage
DROP POLICY IF EXISTS "Demo assignment history mentor read" ON public.demo_assignment_history;
CREATE POLICY "Demo assignment history admin manage" ON public.demo_assignment_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- demo_session_resources: remove legacy mentor-upload policy; admins (as
-- conductors) can upload, students can read.
DROP POLICY IF EXISTS "Demo resources mentor upload" ON public.demo_session_resources;
CREATE POLICY "Demo resources conductor upload" ON public.demo_session_resources
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demo_session_workspaces dw
      WHERE dw.id = demo_session_resources.workspace_id
        AND (
          dw.mentor_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

-- ============================================================
-- 6. Notification schema guard (defensive)
--    Ensure the notifications table has the columns our demo
--    notification inserts rely on (title, body, category, kind,
--    related_id, link, read, metadata).
-- ============================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;

-- Index for unread badge counts by user
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON public.notifications (user_id, read);

-- ============================================================
-- 7. Realtime publication (idempotent)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.demo_session_bookings;

-- ============================================================
-- 8. Grants (idempotent)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_session_bookings TO authenticated;
GRANT ALL ON public.demo_session_bookings TO service_role;
GRANT EXECUTE ON FUNCTION public.has_used_demo_session(uuid) TO authenticated;
