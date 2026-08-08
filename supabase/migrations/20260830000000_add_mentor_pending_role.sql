-- ============================================================
-- Add mentor_pending role to app_role enum
--
-- This enables a completely separate mentor signup flow where
-- mentors register independently of students. After signup, the
-- user gets role = mentor_pending until an admin approves them.
--
-- IMPORTANT: This migration ONLY adds the enum value. PostgreSQL
-- does not allow a newly-added enum value to be used in the SAME
-- transaction that creates it (error 55P04). Any functions,
-- triggers, or policies that reference 'mentor_pending' live in
-- the follow-up migration:
--   20260830000001_mentor_pending_role_usage.sql
-- which runs in its own committed transaction after this value
-- is available.
-- ============================================================

-- Add mentor_pending to the app_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'mentor_pending'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mentor_pending';
  END IF;
END
$$;
