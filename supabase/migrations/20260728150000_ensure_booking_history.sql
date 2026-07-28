-- Ensure booking_history exists for session-related audit/logging references
BEGIN;

CREATE TABLE IF NOT EXISTS public.booking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_history_booking_idx ON public.booking_history (booking_id);

ALTER TABLE IF EXISTS public.booking_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'booking_history' AND relnamespace = 'public'::regnamespace) THEN
    CREATE POLICY IF NOT EXISTS booking_history_insert ON public.booking_history
      FOR INSERT TO authenticated
      WITH CHECK (actor_id = auth.uid());
  END IF;
END$$;

COMMIT;
