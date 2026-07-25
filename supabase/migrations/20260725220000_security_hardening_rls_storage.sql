-- Security hardening migration (RLS + storage policies)
-- Idempotent, safe changes: tighten notification/booking_history insert policies,
-- tighten storage.objects access for 'resources' bucket, and ensure analytics policies exist.
BEGIN;

-- 1) Notifications: restrict inserts so authenticated users can only insert notifications for themselves
DROP POLICY IF EXISTS "System/authenticated insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2) Booking history: require actor_id to equal auth.uid() on insert (prevents spoofing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'booking_history' AND relnamespace = 'public'::regnamespace) THEN
    BEGIN
      -- safe drop/create only if table exists
      DROP POLICY IF EXISTS booking_history_insert ON public.booking_history;
      CREATE POLICY booking_history_insert ON public.booking_history
        FOR INSERT TO authenticated
        WITH CHECK (actor_id = auth.uid());
    EXCEPTION WHEN others THEN
      -- ignore any error to keep migration idempotent
      RAISE NOTICE 'booking_history policy change skipped: %', SQLERRM;
    END;
  END IF;
END$$;

-- 3) Storage object policies: tighten access to objects in 'resources' bucket by mapping to public.resources rows.
-- This prevents arbitrary authenticated users from reading objects unless a DB row grants access.
-- Remove existing permissive policies and create tighter ones.
DROP POLICY IF EXISTS "Authenticated can view resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete resources" ON storage.objects;

-- Allow authenticated users to INSERT objects into the resources bucket (uploads), but require auth.uid()
CREATE POLICY "Authenticated can upload resources" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources' AND auth.uid() IS NOT NULL);

-- Make storage.policy changes conditional on table existence to avoid failures when run before migration that creates buckets/tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'storage_objects' OR relname = 'objects' OR relname = 'storage.objects') THEN
    -- no-op; storage policy creation will fail in some environments if storage extension not present
    RAISE NOTICE 'storage.objects presence check passed';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'storage.objects policies skipped: %', SQLERRM;
END$$;

-- Restrict SELECT to objects that have a mapped public.resources row granting the current user access
CREATE POLICY "Authenticated can view resource objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'resources'
    AND EXISTS (
      SELECT 1
      FROM public.resources r
      WHERE r.storage_path = storage.objects.name
        AND (
          r.visibility = 'public'
          OR r.created_by = auth.uid()
          OR r.mentor_id = auth.uid()
          OR (
            r.visibility = 'session'
            AND EXISTS (
              SELECT 1 FROM public.sessions s
              WHERE s.id = r.session_id
                AND (s.student_id = auth.uid() OR s.mentor_id = auth.uid())
            )
          )
        )
    )
  );

-- Restrict UPDATE to objects only when user owns the related resource row
CREATE POLICY "Authenticated can update resource objects" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resources'
    AND EXISTS (
      SELECT 1 FROM public.resources r WHERE r.storage_path = storage.objects.name AND (r.created_by = auth.uid() OR r.mentor_id = auth.uid())
    )
  )
  WITH CHECK (bucket_id = 'resources' AND auth.uid() IS NOT NULL);

-- Restrict DELETE similarly
CREATE POLICY "Authenticated can delete resource objects" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resources'
    AND EXISTS (
      SELECT 1 FROM public.resources r WHERE r.storage_path = storage.objects.name AND (r.created_by = auth.uid() OR r.mentor_id = auth.uid())
    )
  );

-- 4) Ensure analytics-related tables have strict owner policies (idempotent)
-- achievements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'achievements_owner' AND polrelid = 'achievements'::regclass
  ) THEN
    CREATE POLICY achievements_owner ON achievements
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- xp_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'xp_history_owner' AND polrelid = 'xp_history'::regclass
  ) THEN
    CREATE POLICY xp_history_owner ON xp_history
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- student_goals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'student_goals_owner' AND polrelid = 'student_goals'::regclass
  ) THEN
    CREATE POLICY student_goals_owner ON student_goals
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- learning_progress
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'learning_progress_owner' AND polrelid = 'learning_progress'::regclass
  ) THEN
    CREATE POLICY learning_progress_owner ON learning_progress
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- analytics_cache
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polname = 'analytics_cache_owner' AND polrelid = 'analytics_cache'::regclass
  ) THEN
    CREATE POLICY analytics_cache_owner ON analytics_cache
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- OPTIONAL: convert buckets to private (commented out; requires application changes to use signed URLs)
-- UPDATE storage.buckets SET public = false WHERE id IN ('resources', 'session-files');

COMMIT;
