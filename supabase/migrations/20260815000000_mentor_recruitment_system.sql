-- ============================================================
-- Mentor Recruitment System — Phase 6
-- Adds missing columns, activation history, and RLS hardening
-- for the complete admin-controlled mentor application pipeline.
-- ============================================================

-- ============================================================
-- 1. Extend mentor_applications with full application fields
-- ============================================================
ALTER TABLE public.mentor_applications
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS years_of_experience integer,
  ADD COLUMN IF NOT EXISTS current_occupation text,
  ADD COLUMN IF NOT EXISTS highest_qualification text,
  ADD COLUMN IF NOT EXISTS teaching_experience text,
  ADD COLUMN IF NOT EXISTS certifications text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_time_slots text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS interview_result text,
  ADD COLUMN IF NOT EXISTS interview_reason text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS activation_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS temp_password_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS temp_password_hash text,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS application_id_display text;

-- Generate a human-readable application ID for display
UPDATE public.mentor_applications
SET application_id_display = 'LNG-MA-' || UPPER(LEFT(REPLACE(id::text, '-', ''), 8))
WHERE application_id_display IS NULL;