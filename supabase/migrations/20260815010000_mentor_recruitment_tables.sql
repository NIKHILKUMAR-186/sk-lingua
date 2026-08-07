-- ============================================================
-- Mentor Recruitment System — Phase 6 (Part 2)
-- Creates activation history, notes tables, interview result columns,
-- RLS hardening, storage bucket, and indexes.
-- ============================================================

-- ============================================================
-- 1. Create mentor_activation_history table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mentor_activation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.mentor_applications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mentor_activation_history TO authenticated;
GRANT ALL ON public.mentor_activation_history TO service_role;

ALTER TABLE public.mentor_activation_history ENABLE ROW LEVEL SECURITY;

-- Admins can manage activation history
CREATE POLICY "Activation history admin manage" ON public.mentor_activation_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Applicant can view their own activation history
CREATE POLICY "Activation history owner view" ON public.mentor_activation_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 2. Create mentor_notes table for admin notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mentor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.mentor_applications(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mentor_notes TO authenticated;
GRANT ALL ON public.mentor_notes TO service_role;

ALTER TABLE public.mentor_notes ENABLE ROW LEVEL SECURITY;

-- Admins can manage notes
CREATE POLICY "Mentor notes admin manage" ON public.mentor_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Applicant can view notes on their own application
CREATE POLICY "Mentor notes owner view" ON public.mentor_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mentor_applications ma
      WHERE ma.id = mentor_notes.application_id
        AND ma.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Add interview result columns to interviews table
-- ============================================================
ALTER TABLE public.mentor_application_interviews
  ADD COLUMN IF NOT EXISTS result text,
  ADD COLUMN IF NOT EXISTS result_notes text,
  ADD COLUMN IF NOT EXISTS result_at timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_link text;