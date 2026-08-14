-- ============================================================
-- P1: SUBSCRIPTION PLAN ENGINE
-- Additive hardening of the existing subscription_plans table.
-- No new table is created: we REUSE the existing subscription_plans
-- entity (student_subscriptions.plan_id already references its id),
-- so P2 can keep building on this same stable plan_id foundation.
-- ============================================================

-- ============================================================
-- 1. Server-side / database-level data integrity constraints.
--    Validation is enforced here (not only in the UI).
-- ============================================================

-- Price must never be negative.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_subscription_plans_price_nonneg'
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT ck_subscription_plans_price_nonneg CHECK (price >= 0);
  END IF;
END $$;

-- Session count must be positive.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_subscription_plans_num_sessions_pos'
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT ck_subscription_plans_num_sessions_pos CHECK (num_sessions > 0);
  END IF;
END $$;

-- Validity must be positive when set (NULL = no expiry / permanent plan).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_subscription_plans_validity_pos'
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT ck_subscription_plans_validity_pos
      CHECK (validity_days IS NULL OR validity_days > 0);
  END IF;
END $$;

-- ============================================================
-- 2. updated_at auto-maintenance.
--    Reuses the project's existing update_updated_at_column() helper.
-- ============================================================
DROP TRIGGER IF EXISTS trg_subscription_plans_updated ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Deterministic ordering index (sort_order ASC, created_at ASC
--    as the tie-breaker) so plans do not randomly reorder.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort
  ON public.subscription_plans (sort_order ASC, created_at ASC);
