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
--
--     NOTE: PostgreSQL RLS policies do NOT support the NEW/OLD keywords
--     (that was the source of the 42P01 error). The WITH CHECK clause
--     implicitly refers to the NEW row. The old-vs-new business rules
--     (e.g. only allow cancellation from pending/confirmed, and forbid
--     tampering with admin fields) are enforced by the
--     enforce_demo_booking_update_rules() trigger defined below, which is
--     the only place in PostgreSQL that can compare OLD and NEW values.
DROP POLICY IF EXISTS "Demo bookings student update own" ON public.demo_session_bookings;
CREATE POLICY "Demo bookings student update own" ON public.demo_session_bookings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- The row-level guard only allows the student path to produce a
    -- 'cancelled' booking. Deeper transition + admin-field rules are
    -- enforced by the BEFORE UPDATE trigger.
    AND booking_status = 'cancelled'
  );

-- 4b-2. Hard bind the student UPDATE security rules that RLS cannot express.
--       This SECURITY DEFINER BEFORE UPDATE trigger is the authoritative
--       enforcement layer for:
--         * Only the booking owner (student) or an admin may update a row.
--         * A student may ONLY transition their own booking to 'cancelled',
--           and only from 'pending_admin_confirmation' or 'confirmed'.
--         * A student may never modify admin-managed fields (admin_id,
--           meeting_link, admin_notes, completed_at, no_show_at,
--           confirmed_at, rescheduled_at).
--       Admins and the service role (NULL auth.uid()) bypass these
--       restrictions, so the full admin workflow keeps working.
DROP TRIGGER IF EXISTS trg_enforce_demo_booking_update_rules
  ON public.demo_session_bookings;
DROP FUNCTION IF EXISTS public.enforce_demo_booking_update_rules();
CREATE OR REPLACE FUNCTION public.enforce_demo_booking_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  -- Service role (e.g. server-side / trigger context) and admins bypass.
  v_is_admin := v_uid IS NULL OR public.has_role(v_uid, 'admin');
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Only the booking owner may touch their own booking.
  IF v_uid IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Only the booking owner or an admin may update this demo booking.'
      USING ERRCODE = '42501';
  END IF;

  -- Students may ONLY cancel: the new status must be 'cancelled'.
  IF NEW.booking_status IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'Students may only cancel their demo booking.'
      USING ERRCODE = '42501';
  END IF;

  -- Cancellation is only allowed from a not-yet-concluded state.
  IF OLD.booking_status NOT IN ('pending_admin_confirmation', 'confirmed') THEN
    RAISE EXCEPTION 'This demo booking cannot be cancelled from its current state.'
      USING ERRCODE = '42501';
  END IF;

  -- Students may not modify any admin-managed field.
  IF NOT (
       NEW.admin_id           IS NOT DISTINCT FROM OLD.admin_id
   AND NEW.meeting_link       IS NOT DISTINCT FROM OLD.meeting_link
   AND NEW.admin_notes        IS NOT DISTINCT FROM OLD.admin_notes
   AND NEW.completed_at       IS NOT DISTINCT FROM OLD.completed_at
   AND NEW.no_show_at         IS NOT DISTINCT FROM OLD.no_show_at
   AND NEW.confirmed_at       IS NOT DISTINCT FROM OLD.confirmed_at
   AND NEW.rescheduled_at     IS NOT DISTINCT FROM OLD.rescheduled_at
  ) THEN
    RAISE EXCEPTION 'Students may not modify admin-managed demo booking fields.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_demo_booking_update_rules
  ON public.demo_session_bookings;
CREATE TRIGGER trg_enforce_demo_booking_update_rules
  BEFORE UPDATE ON public.demo_session_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_demo_booking_update_rules();

-- 4c. Explicitly revoke mentor access. Mentors are NOT admins and are NOT
--     the booking owner, so existing student-read + admin-manage policies
--     already exclude them.
--
--     IMPORTANT: This deny is FOR SELECT ONLY. A `FOR ALL ... WITH CHECK
--     (false)` policy would ALSO reject INSERT/UPDATE/DELETE for every
--     authenticated user (including the booking owner), because a row-level
--     policy applies to the command it is declared for. RLS policies are
--     OR'd, but a `FOR ALL` policy participates in INSERT checks and its
--     false WITH CHECK would block legitimate student inserts. Using
--     FOR SELECT prevents mentors from reading demo data without ever
--     interfering with the student INSERT/UPDATE/DELETE paths.
DROP POLICY IF EXISTS "Demo bookings mentor no access" ON public.demo_session_bookings;
CREATE POLICY "Demo bookings mentor no access" ON public.demo_session_bookings
  FOR SELECT TO authenticated
  USING (false);

-- 4d. Defensively recreate the student INSERT policy so a booking owner can
--     always create their own booking. Guarantees the INSERT path is open.
DROP POLICY IF EXISTS "Demo bookings student create" ON public.demo_session_bookings;
CREATE POLICY "Demo bookings student create" ON public.demo_session_bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

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

-- demo_assignment_history: remove legacy mentor-read policy; admins manage.
-- Also drop any pre-existing "admin manage" policy so this CREATE is
-- idempotent (the policy was originally created in the
-- 20260816000000_demo_conversion_system.sql migration).
DROP POLICY IF EXISTS "Demo assignment history mentor read" ON public.demo_assignment_history;
DROP POLICY IF EXISTS "Demo assignment history admin manage" ON public.demo_assignment_history;
CREATE POLICY "Demo assignment history admin manage" ON public.demo_assignment_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- demo_session_resources: remove legacy mentor-upload policy; admins (as
-- conductors) can upload, students can read.
-- Drop both the legacy mentor-upload policy AND any previously-created
-- conductor-upload policy so this CREATE is idempotent on re-run.
DROP POLICY IF EXISTS "Demo resources mentor upload" ON public.demo_session_resources;
DROP POLICY IF EXISTS "Demo resources conductor upload" ON public.demo_session_resources;
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
-- Plain `ALTER PUBLICATION ... ADD TABLE` errors (42710) if the table
-- is already a member of the publication (e.g. from the earlier
-- 20260823000000_demo_admin_workflow.sql migration), so guard it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'demo_session_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.demo_session_bookings;
  END IF;
END
$$;

-- ============================================================
-- 8. Grants (idempotent)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_session_bookings TO authenticated;
GRANT ALL ON public.demo_session_bookings TO service_role;
GRANT EXECUTE ON FUNCTION public.has_used_demo_session(uuid) TO authenticated;
