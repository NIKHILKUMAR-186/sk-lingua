-- ============================================================
-- Phase 2: Booking holds and mentor profile fields
-- ============================================================

-- ============================================================
-- 1. Create booking_holds table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.session_requests(id) ON DELETE CASCADE,
  scheduled_time timestamptz NOT NULL,
  duration_mins integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.booking_holds TO authenticated;
GRANT ALL ON public.booking_holds TO service_role;

ALTER TABLE public.booking_holds ENABLE ROW LEVEL SECURITY;

-- Create policies idempotently. `IF NOT EXISTS` on CREATE POLICY is only
-- available on Postgres 15+, so guard with a pg_policy check to support all
-- supported Supabase Postgres versions.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'booking_holds_admin_manage'
      AND polrelid = 'public.booking_holds'::regclass
  ) THEN
    CREATE POLICY "booking_holds_admin_manage" ON public.booking_holds
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'booking_holds_service_all'
      AND polrelid = 'public.booking_holds'::regclass
  ) THEN
    CREATE POLICY "booking_holds_service_all" ON public.booking_holds
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_holds_updated ON public.booking_holds;
CREATE TRIGGER trg_booking_holds_updated
  BEFORE UPDATE ON public.booking_holds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_booking_holds_mentor ON public.booking_holds(mentor_id);
CREATE INDEX IF NOT EXISTS idx_booking_holds_booking ON public.booking_holds(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_holds_expires ON public.booking_holds(expires_at);

-- Only add the table to the realtime publication if it isn't already there, so
-- the migration is safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'booking_holds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_holds;
  END IF;
END;
$$;

-- ============================================================
-- 2. Extend mentor_profiles with additional fields
-- ============================================================
ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS years_experience integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reviews integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_students integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sessions integer DEFAULT 0;

-- ============================================================
-- 3. Add missing fields to session_requests if not present
-- ============================================================
ALTER TABLE public.session_requests
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS sla_assigned_at timestamptz;

-- Backfill sla_deadline from mentor_session_requests for existing pending rows
UPDATE public.session_requests sr
SET sla_deadline = msr.response_deadline
FROM public.mentor_session_requests msr
WHERE msr.booking_id = sr.id
  AND msr.status = 'pending'
  AND sr.sla_deadline IS NULL;

-- ============================================================
-- 4. Create function to cleanup expired holds
-- ============================================================
-- This function is also defined (with a richer, released_at-aware body) in
-- 20261001000000_p6_smart_booking_system.sql. The two MUST share the same
-- signature (RETURNS integer) — CREATE OR REPLACE cannot change a function's
-- return type, which is what produced the "cannot change return type" (42P13)
-- error when this migration was re-run against an already-migrated DB.
--
-- To stay fully idempotent and never overwrite / downgrade the canonical
-- version that may already exist, we only CREATE the function when it does
-- not exist yet (checked via pg_proc), and re-grant execute (grants are
-- naturally idempotent).
DO $hold$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'cleanup_expired_holds'
      AND p.pronargs = 0
  ) THEN
    CREATE FUNCTION public.cleanup_expired_holds()
    RETURNS integer
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      v_count integer;
    BEGIN
      UPDATE public.booking_holds
      SET status = 'expired', updated_at = now()
      WHERE status = 'active'
        AND expires_at <= now();

      GET DIAGNOSTICS v_count = ROW_COUNT;
      RETURN v_count;
    END;
    $func$;
  END IF;
END;
$hold$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_holds() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_holds() TO service_role;