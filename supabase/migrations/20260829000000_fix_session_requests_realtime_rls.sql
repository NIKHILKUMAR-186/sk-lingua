-- ============================================================
-- Fix Session Requests Pipeline — Realtime + RLS + Status
--
-- ROOT CAUSE: The `session_requests` table was NEVER added to the
-- `supabase_realtime` publication. The admin booking queue subscribes
-- to realtime changes on this table, but since the table isn't in the
-- publication, no INSERT/UPDATE/DELETE events are ever broadcast.
-- The admin queue therefore never auto-updates when a student creates
-- a request — it only shows data on manual refresh.
--
-- This migration:
--   1. Adds `session_requests` to the `supabase_realtime` publication
--   2. Adds missing RLS policies (Admin DELETE, Mentor SELECT)
--   3. Normalizes status values to a single source of truth
--   4. Adds a status CHECK constraint to enforce valid statuses
-- ============================================================

-- ============================================================
-- 1. Add session_requests to supabase_realtime publication
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'session_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_requests;
  END IF;
END
$$;

-- ============================================================
-- 2. RLS Policies
--
-- Current policies (from 20260806120000 + 20260806180500):
--   * Students create own request        (INSERT)
--   * Students read own request          (SELECT)
--   * Students update own request        (UPDATE)
--   * Admins select all requests         (SELECT)
--   * Admins update all requests         (UPDATE)
--
-- MISSING:
--   * Admin DELETE all requests          (DELETE)
--   * Mentor SELECT assigned requests    (SELECT)
-- ============================================================

-- 2a. Admin DELETE policy (admins can delete any request)
DROP POLICY IF EXISTS "session_requests_admin_delete" ON public.session_requests;
CREATE POLICY "session_requests_admin_delete" ON public.session_requests
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2b. Mentor SELECT policy (mentors can read requests assigned to them)
DROP POLICY IF EXISTS "session_requests_mentor_select" ON public.session_requests;
CREATE POLICY "session_requests_mentor_select" ON public.session_requests
  FOR SELECT TO authenticated
  USING (assigned_mentor = auth.uid());

-- ============================================================
-- 3. Status Normalization
--
-- Single source of truth for session_requests.status:
--   * pending_admin_assignment  -> Student created, awaiting admin
--   * pending_mentor_response   -> Admin assigned mentor, awaiting response
--   * confirmed                 -> Mentor accepted, session confirmed
--   * completed                 -> Session completed
--   * cancelled                 -> Request cancelled
--   * unassigned                -> Mentor rejected/timed out, needs reassignment
--
-- Normalize any legacy/old status values to the canonical set.
-- ============================================================

-- Normalize legacy statuses to the canonical set
UPDATE public.session_requests
SET status = 'pending_admin_assignment'
WHERE status IN ('pending', 'pending_assignment', 'waiting', 'submitted');

UPDATE public.session_requests
SET status = 'pending_mentor_response'
WHERE status IN ('assigned', 'mentor_assigned', 'awaiting_mentor');

UPDATE public.session_requests
SET status = 'confirmed'
WHERE status IN ('accepted', 'approved');

UPDATE public.session_requests
SET status = 'unassigned'
WHERE status IN ('rejected', 'declined', 'timeout', 'expired');

-- Add a CHECK constraint to enforce the canonical status set
-- (drop any existing constraint first for idempotency)
ALTER TABLE public.session_requests DROP CONSTRAINT IF EXISTS session_requests_status_check;
ALTER TABLE public.session_requests ADD CONSTRAINT session_requests_status_check
  CHECK (status IN (
    'pending_admin_assignment',
    'pending_mentor_response',
    'confirmed',
    'completed',
    'cancelled',
    'unassigned'
  ));

-- ============================================================
-- 4. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_session_requests_status
  ON public.session_requests(status);
CREATE INDEX IF NOT EXISTS idx_session_requests_student
  ON public.session_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_session_requests_mentor
  ON public.session_requests(assigned_mentor);
CREATE INDEX IF NOT EXISTS idx_session_requests_created
  ON public.session_requests(created_at DESC);

-- ============================================================
-- 5. Grants (idempotent)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_requests TO authenticated;
GRANT ALL ON public.session_requests TO service_role;