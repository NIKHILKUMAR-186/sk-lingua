-- ============================================================
-- Ensure mentor_applications has the `state` column
--
-- PROBLEM:
--   The mentor application form treats `state` (State / Region) as a
--   required field and sends it when saving a draft. The mentor_applications
--   table never had a `state` column (only `country` and `city` were added
--   in 20260815000000). When the client tried to insert/update a row with a
--   column that does not exist, Supabase returned a 400 "could not find the
--   'state' column" error, which surfaced as "Save Draft failed."
--
-- FIX:
--   Add the missing `state` column (idempotent).
--
-- Idempotent: safe to run on fresh and existing databases.
-- ============================================================

ALTER TABLE public.mentor_applications
  ADD COLUMN IF NOT EXISTS state text;
