-- ============================================================
-- Fix Demo Booking INSERT blocked by Row-Level Security
--
-- PROBLEM:
--   A student booking a demo session received:
--     "new row violates row-level security policy"
--
--   Root cause: the hardening migration created a blanket
--   `FOR ALL ... WITH CHECK (false)` policy named
--   "Demo bookings mentor no access". Because a `FOR ALL`
--   policy also participates in INSERT checks, its `WITH CHECK
--   (false)` rejected EVERY new demo booking row for EVERY
--   authenticated user — including the legitimate booking owner.
--
-- FIX:
--   1. Drop the `FOR ALL` deny policy and replace it with a
--      `FOR SELECT ONLY` deny. A SELECT-only deny prevents
--      mentors from REading demo data but never interferes with
--      the student INSERT/UPDATE/DELETE paths.
--   2. Defensively recreate the student INSERT policy so the
--      booking owner can always create their own booking.
--
-- Idempotent: safe to run on fresh and existing databases.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Fix the mentor deny policy (FOR ALL -> FOR SELECT ONLY)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Demo bookings mentor no access" ON public.demo_session_bookings;
CREATE POLICY "Demo bookings mentor no access" ON public.demo_session_bookings
  FOR SELECT TO authenticated
  USING (false);

-- ------------------------------------------------------------
-- 2. Defensively recreate the student INSERT policy
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Demo bookings student create" ON public.demo_session_bookings;
CREATE POLICY "Demo bookings student create" ON public.demo_session_bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- 3. Ensure grants are present (idempotent) so the student
--    (authenticated role) actually has INSERT privilege.
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_session_bookings TO authenticated;
GRANT ALL ON public.demo_session_bookings TO service_role;
