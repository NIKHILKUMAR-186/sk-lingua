-- ============================================================
-- Subscription Management Enhancement — Complete Enterprise Architecture
-- ============================================================
-- This migration adds:
--   1. bonus_slots tracking to student_subscriptions
--   2. subscription_slot_adjustments table for admin audit trail
--   3. subscription_usage_logs table for tracking consumption
--   4. Functions for automatic slot management
--   5. Enhanced RLS policies
-- ============================================================

-- ============================================================
-- 1. Enhance student_subscriptions table
-- ============================================================

-- Add bonus_slots column
ALTER TABLE public.student_subscriptions
  ADD COLUMN IF NOT EXISTS bonus_slots integer NOT NULL DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.student_subscriptions.bonus_slots IS 'Bonus sessions granted by admin (not part of original plan)';

-- ============================================================
-- 2. Create subscription_slot_adjustments table
-- ============================================================
-- This table tracks EVERY manual adjustment made by admins

CREATE TABLE IF NOT EXISTS public.subscription_slot_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.student_subscriptions(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'increase_slots', 'decrease_slots', 'add_bonus', 'remove_bonus', 'extend_expiry', 'expire', 'suspend', 'reactivate', 'replace'
  old_remaining_slots integer NOT NULL,
  new_remaining_slots integer NOT NULL,
  old_bonus_slots integer NOT NULL,
  new_bonus_slots integer NOT NULL,
  reason text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb, -- store additional context (old_expiry, new_expiry, old_plan, new_plan, etc.)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_slot_adjustments_student 
  ON public.subscription_slot_adjustments(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_slot_adjustments_subscription 
  ON public.subscription_slot_adjustments(subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_slot_adjustments_admin 
  ON public.subscription_slot_adjustments(admin_id, created_at DESC);

-- ============================================================
-- 3. Create subscription_usage_logs table
-- ============================================================
-- This table tracks automatic slot consumption from completed sessions

CREATE TABLE IF NOT EXISTS public.subscription_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.student_subscriptions(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'session_completed', 'session_cancelled', 'session_rescheduled', 'session_rejected', 'technical_failure', 'admin_compensation'
  slots_consumed integer NOT NULL DEFAULT 0, -- positive = consumed, negative = restored
  old_remaining_slots integer NOT NULL,
  new_remaining_slots integer NOT NULL,
  old_used_slots integer NOT NULL,
  new_used_slots integer NOT NULL,
  session_status text, -- status of session when this log was created
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_logs_student 
  ON public.subscription_usage_logs(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_subscription 
  ON public.subscription_usage_logs(subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_logs_session 
  ON public.subscription_usage_logs(session_id) WHERE session_id IS NOT NULL;

-- ============================================================
-- 4. Grants
-- ============================================================

-- subscription_slot_adjustments
GRANT SELECT ON public.subscription_slot_adjustments TO authenticated;
GRANT ALL ON public.subscription_slot_adjustments TO service_role;

-- subscription_usage_logs
GRANT SELECT ON public.subscription_usage_logs TO authenticated;
GRANT ALL ON public.subscription_usage_logs TO service_role;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

ALTER TABLE public.subscription_slot_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage_logs ENABLE ROW LEVEL SECURITY;

-- Students can read their own adjustment history
CREATE POLICY "Slot adjustments student read own" ON public.subscription_slot_adjustments
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Students can read their own usage logs
CREATE POLICY "Usage logs student read own" ON public.subscription_usage_logs
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Admins can manage all adjustments
CREATE POLICY "Slot adjustments admin manage" ON public.subscription_slot_adjustments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can read all usage logs
CREATE POLICY "Usage logs admin read" ON public.subscription_usage_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert logs
CREATE POLICY "Usage logs service insert" ON public.subscription_usage_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ============================================================
-- 6. Functions for slot management
-- ============================================================

-- Function to create adjustment record (called by admin actions)
CREATE OR REPLACE FUNCTION create_slot_adjustment(
  p_student_id uuid,
  p_subscription_id uuid,
  p_admin_id uuid,
  p_action text,
  p_old_remaining_slots integer,
  p_new_remaining_slots integer,
  p_old_bonus_slots integer,
  p_new_bonus_slots integer,
  p_reason text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.subscription_slot_adjustments AS $$
DECLARE
  v_adjustment public.subscription_slot_adjustments;
BEGIN
  INSERT INTO public.subscription_slot_adjustments (
    student_id,
    subscription_id,
    admin_id,
    action,
    old_remaining_slots,
    new_remaining_slots,
    old_bonus_slots,
    new_bonus_slots,
    reason,
    metadata
  ) VALUES (
    p_student_id,
    p_subscription_id,
    p_admin_id,
    p_action,
    p_old_remaining_slots,
    p_new_remaining_slots,
    p_old_bonus_slots,
    p_new_bonus_slots,
    p_reason,
    p_metadata
  )
  RETURNING * INTO v_adjustment;

  RETURN v_adjustment;
END;
$$ LANGUAGE plpgsql;

-- Function to create usage log (called when session status changes)
CREATE OR REPLACE FUNCTION create_usage_log(
  p_student_id uuid,
  p_subscription_id uuid,
  p_session_id uuid,
  p_action text,
  p_slots_consumed integer,
  p_old_remaining_slots integer,
  p_new_remaining_slots integer,
  p_old_used_slots integer,
  p_new_used_slots integer,
  p_session_status text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.subscription_usage_logs AS $$
DECLARE
  v_log public.subscription_usage_logs;
BEGIN
  INSERT INTO public.subscription_usage_logs (
    student_id,
    subscription_id,
    session_id,
    action,
    slots_consumed,
    old_remaining_slots,
    new_remaining_slots,
    old_used_slots,
    new_used_slots,
    session_status,
    metadata
  ) VALUES (
    p_student_id,
    p_subscription_id,
    p_session_id,
    p_action,
    p_slots_consumed,
    p_old_remaining_slots,
    p_new_remaining_slots,
    p_old_used_slots,
    p_new_used_slots,
    p_session_status,
    p_metadata
  )
  RETURNING * INTO v_log;

  RETURN v_log;
END;
$$ LANGUAGE plpgsql;

-- Function to check if subscription can book (enhanced)
CREATE OR REPLACE FUNCTION check_subscription_can_book(
  p_user_id uuid
)
RETURNS TABLE(
  can_book boolean,
  reason text,
  slots_remaining integer,
  subscription_status text,
  is_expired boolean
) AS $$
DECLARE
  v_subscription public.student_subscriptions;
BEGIN
  -- Get active subscription
  SELECT * INTO v_subscription
  FROM public.student_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- No subscription found
  IF NOT FOUND THEN
    can_book := false;
    reason := 'No active subscription';
    slots_remaining := 0;
    subscription_status := 'none';
    is_expired := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check if expired
  IF v_subscription.expires_at IS NOT NULL AND v_subscription.expires_at < now() THEN
    can_book := false;
    reason := 'Subscription expired';
    slots_remaining := v_subscription.current_session_slots;
    subscription_status := 'expired';
    is_expired := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check if slots available (including bonus slots)
  IF (v_subscription.current_session_slots + v_subscription.bonus_slots) <= 0 THEN
    can_book := false;
    reason := 'No slots remaining';
    slots_remaining := 0;
    subscription_status := v_subscription.status;
    is_expired := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Can book
  can_book := true;
  reason := NULL;
  slots_remaining := v_subscription.current_session_slots + v_subscription.bonus_slots;
  subscription_status := v_subscription.status;
  is_expired := false;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 7. Trigger for automatic usage logging
-- ============================================================
-- This trigger automatically logs when a session is completed

CREATE OR REPLACE FUNCTION log_session_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription public.student_subscriptions;
  v_old_remaining integer;
  v_new_remaining integer;
  v_old_used integer;
  v_new_used integer;
BEGIN
  -- Only act when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get active subscription for this student
    SELECT * INTO v_subscription
    FROM public.student_subscriptions
    WHERE user_id = NEW.student_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      v_old_remaining := v_subscription.current_session_slots;
      v_old_used := v_subscription.used_session_slots;

      -- Deduct slot
      UPDATE public.student_subscriptions
      SET 
        current_session_slots = GREATEST(current_session_slots - 1, 0),
        used_session_slots = used_session_slots + 1,
        updated_at = now()
      WHERE id = v_subscription.id
      RETURNING current_session_slots, used_session_slots INTO v_new_remaining, v_new_used;

      -- Create usage log
      PERFORM create_usage_log(
        NEW.student_id,
        v_subscription.id,
        NEW.id,
        'session_completed',
        1,
        v_old_remaining,
        v_new_remaining,
        v_old_used,
        v_new_used,
        NEW.status,
        jsonb_build_object('session_duration_mins', NEW.duration_mins)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_log_session_completion ON public.sessions;

-- Create trigger
CREATE TRIGGER trg_log_session_completion
  AFTER UPDATE OF status ON public.sessions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION log_session_completion();

-- ============================================================
-- 8. Realtime publication
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_slot_adjustments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_usage_logs;

-- ============================================================
-- 9. Update existing student_subscriptions with bonus_slots = 0
-- ============================================================
UPDATE public.student_subscriptions
SET bonus_slots = 0
WHERE bonus_slots IS NULL;

-- ============================================================
-- 10. Helper function to get subscription summary for admin
-- ============================================================
CREATE OR REPLACE FUNCTION get_subscription_summary(p_user_id uuid)
RETURNS TABLE(
  subscription_id uuid,
  plan_name text,
  status text,
  total_slots integer,
  used_slots integer,
  remaining_slots integer,
  bonus_slots integer,
  available_slots integer,
  expires_at timestamptz,
  activated_at timestamptz,
  days_until_expiry integer
) AS $$
DECLARE
  v_sub public.student_subscriptions;
  v_plan public.subscription_plans;
BEGIN
  SELECT * INTO v_sub
  FROM public.student_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT name INTO v_plan
  FROM public.subscription_plans
  WHERE id = v_sub.plan_id;

  subscription_id := v_sub.id;
  plan_name := v_plan.name;
  status := v_sub.status;
  total_slots := v_sub.total_session_slots;
  used_slots := v_sub.used_session_slots;
  remaining_slots := v_sub.current_session_slots;
  bonus_slots := v_sub.bonus_slots;
  available_slots := v_sub.current_session_slots + v_sub.bonus_slots;
  expires_at := v_sub.expires_at;
  activated_at := v_sub.activated_at;
  
  IF v_sub.expires_at IS NOT NULL THEN
    days_until_expiry := EXTRACT(DAY FROM (v_sub.expires_at - now()))::integer;
  ELSE
    days_until_expiry := NULL;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 11. Helper function to get all students with subscription stats (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION get_all_student_subscriptions()
RETURNS TABLE(
  student_id uuid,
  student_name text,
  student_email text,
  subscription_id uuid,
  plan_name text,
  status text,
  total_slots integer,
  used_slots integer,
  remaining_slots integer,
  bonus_slots integer,
  available_slots integer,
  expires_at timestamptz,
  activated_at timestamptz,
  days_until_expiry integer,
  is_near_expiry boolean,
  is_zero_slots boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as student_id,
    p.full_name as student_name,
    p.email as student_email,
    s.id as subscription_id,
    sp.name as plan_name,
    s.status,
    s.total_session_slots,
    s.used_session_slots,
    s.current_session_slots,
    s.bonus_slots,
    (s.current_session_slots + s.bonus_slots) as available_slots,
    s.expires_at,
    s.activated_at,
    CASE 
      WHEN s.expires_at IS NOT NULL THEN EXTRACT(DAY FROM (s.expires_at - now()))::integer
      ELSE NULL
    END as days_until_expiry,
    CASE 
      WHEN s.expires_at IS NOT NULL AND EXTRACT(DAY FROM (s.expires_at - now())) <= 7 
      THEN true 
      ELSE false 
    END as is_near_expiry,
    CASE 
      WHEN (s.current_session_slots + s.bonus_slots) = 0 THEN true 
      ELSE false 
    END as is_zero_slots
  FROM public.student_subscriptions s
  INNER JOIN public.profiles p ON p.id = s.user_id
  INNER JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 12. Comments for documentation
-- ============================================================
COMMENT ON TABLE public.subscription_slot_adjustments IS 'Audit trail for all manual slot adjustments made by admins';
COMMENT ON TABLE public.subscription_usage_logs IS 'Automatic logs of slot consumption from session lifecycle events';
COMMENT ON FUNCTION create_slot_adjustment IS 'Creates an audit record for manual slot adjustments';
COMMENT ON FUNCTION create_usage_log IS 'Creates an audit record for automatic slot consumption';
COMMENT ON FUNCTION check_subscription_can_book IS 'Enhanced check if a user can book a session (includes bonus slots)';
COMMENT ON FUNCTION get_subscription_summary IS 'Get detailed subscription summary for a specific user';
COMMENT ON FUNCTION get_all_student_subscriptions IS 'Get all active student subscriptions with stats (admin only)';