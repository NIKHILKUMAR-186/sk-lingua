-- ============================================================
-- Admin Modules Enhancement
-- Adds columns needed for Subscription Plans Management and
-- Mentor Verification & Approval modules.
-- ============================================================

-- ============================================================
-- 1. Extend subscription_plans for admin management
-- ============================================================
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS monthly_price numeric(10, 2),
  ADD COLUMN IF NOT EXISTS yearly_price numeric(10, 2),
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS popular boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommended_flag boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_limits integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mentor_priority integer DEFAULT 0;

-- Backfill monthly_price / yearly_price from existing price
UPDATE public.subscription_plans SET
  monthly_price = CASE
    WHEN billing_cycle = 'monthly' THEN price
    WHEN billing_cycle = 'yearly' THEN price / 12
    ELSE price
  END,
  yearly_price = CASE
    WHEN billing_cycle = 'yearly' THEN price
    WHEN billing_cycle = 'monthly' THEN price * 12
    ELSE price
  END,
  badge = CASE WHEN recommended = true THEN 'Popular' ELSE NULL END,
  popular = recommended,
  recommended_flag = recommended,
  session_limits = num_sessions
WHERE monthly_price IS NULL;

-- RLS: Admins can manage all plans (full CRUD)
DROP POLICY IF EXISTS "subscription_plans_admin_all" ON public.subscription_plans;
CREATE POLICY "subscription_plans_admin_all" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. Extend mentor_profiles with verification status fields
-- ============================================================
ALTER TABLE public.mentor_profiles
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_date timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- ============================================================
-- 3. Extend session_requests with SLA timer fields
-- ============================================================
ALTER TABLE public.session_requests
  ADD COLUMN IF NOT EXISTS sla_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS sla_reminder_sent boolean DEFAULT false;

-- ============================================================
-- 4. Create assignment_history if it doesn't exist (used by module 1)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.session_requests(id) ON DELETE CASCADE,
  mentor_id uuid REFERENCES auth.users(id),
  status text NOT NULL, -- 'assigned', 'accepted', 'rejected', 'timeout', 'reassigned'
  reason text,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure RLS for assignment_history
ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;

-- Admins can read assignment history
DROP POLICY IF EXISTS "assignment_history_admin_read" ON public.assignment_history;
CREATE POLICY "assignment_history_admin_read" ON public.assignment_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Students can read history for their requests
DROP POLICY IF EXISTS "assignment_history_student_read" ON public.assignment_history;
CREATE POLICY "assignment_history_student_read" ON public.assignment_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.session_requests sr
      WHERE sr.id = assignment_history.request_id
        AND sr.student_id = auth.uid()
    )
  );

-- Mentors can read history for their requests
DROP POLICY IF EXISTS "assignment_history_mentor_read" ON public.assignment_history;
CREATE POLICY "assignment_history_mentor_read" ON public.assignment_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.session_requests sr
      WHERE sr.id = assignment_history.request_id
        AND sr.assigned_mentor = auth.uid()
    )
  );

-- ============================================================
-- 5. Extend sessions table for booking queue statuses
-- ============================================================
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS requested_language text,
  ADD COLUMN IF NOT EXISTS requested_state text,
  ADD COLUMN IF NOT EXISTS preferred_schedule text,
  ADD COLUMN IF NOT EXISTS admin_assignment_count integer DEFAULT 0;

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_billing ON public.subscription_plans(billing_cycle);
CREATE INDEX IF NOT EXISTS idx_session_requests_sla ON public.session_requests(status, sla_deadline) WHERE status = 'pending_mentor_response';
CREATE INDEX IF NOT EXISTS idx_assignment_history_request ON public.assignment_history(request_id, created_at);