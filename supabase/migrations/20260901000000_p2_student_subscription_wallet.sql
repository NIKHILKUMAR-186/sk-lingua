-- ============================================================
-- P2: STUDENT SUBSCRIPTION + WALLET ENTITLEMENT SYSTEM
-- ============================================================

-- 1. Add snapshot columns to student_subscriptions
ALTER TABLE public.student_subscriptions
  ADD COLUMN IF NOT EXISTS price_at_purchase numeric(10, 2),
  ADD COLUMN IF NOT EXISTS currency_at_purchase text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS validity_days_at_purchase integer,
  ADD COLUMN IF NOT EXISTS payment_order_id uuid REFERENCES public.payment_orders(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.student_subscriptions.price_at_purchase IS 'Snapshotted plan price at purchase time';
COMMENT ON COLUMN public.student_subscriptions.currency_at_purchase IS 'Snapshotted currency at purchase time';
COMMENT ON COLUMN public.student_subscriptions.validity_days_at_purchase IS 'Snapshotted validity days at purchase time';
COMMENT ON COLUMN public.student_subscriptions.payment_order_id IS 'Associated payment order for purchase idempotency';

-- 2. Add Unique constraint on payment_order_id for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_student_subscriptions_payment_order'
  ) THEN
    ALTER TABLE public.student_subscriptions
      ADD CONSTRAINT uq_student_subscriptions_payment_order UNIQUE (payment_order_id);
  END IF;
END $$;

-- 3. Add database data integrity constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_student_subscriptions_total_nonneg'
  ) THEN
    ALTER TABLE public.student_subscriptions
      ADD CONSTRAINT ck_student_subscriptions_total_nonneg CHECK (total_session_slots >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_student_subscriptions_current_nonneg'
  ) THEN
    ALTER TABLE public.student_subscriptions
      ADD CONSTRAINT ck_student_subscriptions_current_nonneg CHECK (current_session_slots >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_student_subscriptions_current_lte_total'
  ) THEN
    ALTER TABLE public.student_subscriptions
      ADD CONSTRAINT ck_student_subscriptions_current_lte_total
      CHECK (current_session_slots <= (total_session_slots + bonus_slots));
  END IF;
END $$;

-- 4. Indexes for active subscription queries
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_active_user
  ON public.student_subscriptions (user_id, status, created_at DESC);

-- 5. Helper function for active subscription retrieval
CREATE OR REPLACE FUNCTION public.get_current_student_subscription(p_user_id uuid)
RETURNS SETOF public.student_subscriptions
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.student_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_student_subscription(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_student_subscription(uuid) TO service_role;
