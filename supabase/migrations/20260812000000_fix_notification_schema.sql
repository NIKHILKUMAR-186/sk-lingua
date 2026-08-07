-- Fix notification schema to match the application's expected columns.
-- This migration is idempotent and safe to run on existing databases.
-- It does NOT modify the original migration history.

-- Ensure the notifications table has the columns the app expects.
-- The original migration (20260807010000) created type/payload/is_read,
-- but the app uses title/body/read/link/category/kind/related_id/metadata.

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS read boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS kind text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS related_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Drop legacy columns from the original migration if they exist and are unused.
ALTER TABLE IF EXISTS public.notifications
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS payload,
  DROP COLUMN IF EXISTS is_read;

-- Ensure helpful indexes exist for the notification queries used by the app.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON public.notifications (user_id, category);
