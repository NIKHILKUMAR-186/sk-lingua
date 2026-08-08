-- ============================================================
-- Add human-readable reference_no to public.profiles
--
-- PURPOSE:
--   Users (students, mentors, admins) should be shown a
--   professional human-readable ID (e.g. USER-000001) while the
--   UUID `id` column remains the primary key everywhere:
--     - foreign keys still reference auth.users(id)
--     - RLS still uses auth.uid()
--     - realtime still uses the UUID reference
--     - no existing relationships are altered
--
--   We ADD ONLY a new identity column and do NOT modify `id`,
--   `user_id`, `auth.users`, foreign keys, or RLS logic.
--
--   GENERATED ALWAYS AS IDENTITY automatically backfills existing
--   rows (in row order) and the sequence starts after the max
--   existing value, so new users get the next sequential number.
--
-- Idempotent: safe to run on fresh and existing databases.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reference_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE;

-- Ensure the identity column is readable by the same roles that
-- already have SELECT on profiles (authenticated and anon).
GRANT SELECT (reference_no) ON public.profiles TO authenticated;
GRANT SELECT (reference_no) ON public.profiles TO anon;