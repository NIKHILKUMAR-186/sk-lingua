-- Phase 2.4: Learning analytics, achievements, xp, goals, learning_progress
BEGIN;

CREATE TABLE IF NOT EXISTS achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key text NOT NULL,
  unlocked boolean DEFAULT false,
  progress numeric DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS achievements_user_idx ON achievements (user_id);

CREATE TABLE IF NOT EXISTS xp_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xp_history_user_idx ON xp_history (user_id);

CREATE TABLE IF NOT EXISTS student_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  target integer NOT NULL,
  progress integer DEFAULT 0,
  unit text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_goals_user_idx ON student_goals (user_id);

CREATE TABLE IF NOT EXISTS learning_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill text NOT NULL,
  score numeric DEFAULT 0,
  previous_score numeric DEFAULT 0,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learning_progress_user_idx ON learning_progress (user_id);

CREATE TABLE IF NOT EXISTS analytics_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key text NOT NULL,
  data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_cache_user_idx ON analytics_cache (user_id);

-- RLS
-- Enable RLS and create owner policies if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'achievements' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'achievements_owner' AND polrelid = 'achievements'::regclass) THEN
      EXECUTE E'CREATE POLICY achievements_owner ON achievements FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'xp_history' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'xp_history_owner' AND polrelid = 'xp_history'::regclass) THEN
      EXECUTE E'CREATE POLICY xp_history_owner ON xp_history FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'student_goals' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'student_goals_owner' AND polrelid = 'student_goals'::regclass) THEN
      EXECUTE E'CREATE POLICY student_goals_owner ON student_goals FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'learning_progress' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'learning_progress_owner' AND polrelid = 'learning_progress'::regclass) THEN
      EXECUTE E'CREATE POLICY learning_progress_owner ON learning_progress FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'analytics_cache' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polname = 'analytics_cache_owner' AND polrelid = 'analytics_cache'::regclass) THEN
      EXECUTE E'CREATE POLICY analytics_cache_owner ON analytics_cache FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
  END IF;
END$$;

COMMIT;
