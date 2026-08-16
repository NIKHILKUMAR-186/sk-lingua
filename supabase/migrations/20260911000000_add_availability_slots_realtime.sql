-- P5 — Enable realtime for availability_slots so student availability updates immediately when mentors change their schedule
--
-- Idempotent: only add the table if it isn't already a member of the
-- supabase_realtime publication. A plain
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_slots;
-- fails with ERROR 42710 ("relation ... is already member of publication
-- supabase_realtime") when the table was added by a prior migration, a
-- previous partial run, or Supabase's default publication behavior.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'availability_slots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_slots;
  END IF;
END
$$;
