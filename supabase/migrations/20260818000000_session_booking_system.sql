-- ============================================================
-- Session Booking & Mentor Assignment System
-- ============================================================

-- ============================================================
-- 1. Extend sessions table with additional statuses
-- ============================================================
-- Extend the ENUM type to include new status values for the booking workflow
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_status_check;

-- Add new values to the ENUM type (idempotent - only add if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_admin_assignment' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')) THEN
    ALTER TYPE public.session_status ADD VALUE 'pending_admin_assignment';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_mentor_response' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')) THEN
    ALTER TYPE public.session_status ADD VALUE 'pending_mentor_response';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'confirmed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')) THEN
    ALTER TYPE public.session_status ADD VALUE 'confirmed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'in_progress' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')) THEN
    ALTER TYPE public.session_status ADD VALUE 'in_progress';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')) THEN
    ALTER TYPE public.session_status ADD VALUE 'rejected';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'accepted' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'session_status')) THEN
    ALTER TYPE public.session_status ADD VALUE 'accepted';
  END IF;
END $$;

-- Recreate the check constraint with all status values
ALTER TABLE public.sessions ADD CONSTRAINT sessions_status_check 
  CHECK (status IN (
    'pending',
    'pending_admin_assignment',
    'pending_mentor_response', 
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'rejected',
    'accepted'
  ));

-- Add columns for mentor assignment tracking
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS assignment_history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS timeout_count integer DEFAULT 0;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS last_assigned_at timestamptz;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS mentor_responded_at timestamptz;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_started_at timestamptz;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS session_ended_at timestamptz;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS extension_requested_at timestamptz;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS extension_approved_at timestamptz;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS extension_mins integer DEFAULT 0;

-- ============================================================
-- 2. Create mentor_assignment_logs table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mentor_assignment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) NOT NULL,
  mentor_id uuid REFERENCES auth.users(id) NOT NULL,
  action text NOT NULL, -- 'assigned', 'accepted', 'rejected', 'timeout', 'reassigned'
  notes text,
  performed_by uuid REFERENCES auth.users(id), -- admin who assigned, or mentor who responded
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mentor_assignment_logs TO authenticated;
GRANT ALL ON public.mentor_assignment_logs TO service_role;

ALTER TABLE public.mentor_assignment_logs ENABLE ROW LEVEL SECURITY;

-- Students can read logs for their sessions
CREATE POLICY "Assignment logs student read" ON public.mentor_assignment_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = mentor_assignment_logs.session_id
      AND sessions.student_id = auth.uid()
    )
  );

-- Mentors can read logs for their assigned sessions
CREATE POLICY "Assignment logs mentor read" ON public.mentor_assignment_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = mentor_assignment_logs.session_id
      AND sessions.mentor_id = auth.uid()
    )
  );

-- Admins can manage all logs
CREATE POLICY "Assignment logs admin manage" ON public.mentor_assignment_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role can insert logs
CREATE POLICY "Assignment logs service insert" ON public.mentor_assignment_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ============================================================
-- 3. Create session_extensions table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) NOT NULL,
  requested_by uuid REFERENCES auth.users(id) NOT NULL, -- mentor
  approved_by uuid REFERENCES auth.users(id), -- student
  extension_mins integer NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.session_extensions TO authenticated;
GRANT ALL ON public.session_extensions TO service_role;

ALTER TABLE public.session_extensions ENABLE ROW LEVEL SECURITY;

-- Students can read extensions for their sessions
CREATE POLICY "Session extensions student read" ON public.session_extensions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_extensions.session_id
      AND sessions.student_id = auth.uid()
    )
  );

-- Mentors can create extensions for their sessions
CREATE POLICY "Session extensions mentor create" ON public.session_extensions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_extensions.session_id
      AND sessions.mentor_id = auth.uid()
    )
  );

-- Students can update extensions for their sessions
CREATE POLICY "Session extensions student update" ON public.session_extensions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_extensions.session_id
      AND sessions.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_extensions.session_id
      AND sessions.student_id = auth.uid()
    )
  );

-- Admins can manage all extensions
CREATE POLICY "Session extensions admin manage" ON public.session_extensions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. Create session_reports table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.session_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) NOT NULL,
  reported_by uuid REFERENCES auth.users(id) NOT NULL, -- student
  report_type text NOT NULL, -- 'technical_problem', 'mentor_late', 'mentor_absent', 'poor_audio', 'poor_video', 'behaviour', 'other'
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review', -- 'pending_review', 'mentor_notified', 'under_review', 'resolved', 'closed'
  mentor_response text,
  mentor_responded_at timestamptz,
  admin_notes text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  slot_restored boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.session_reports TO authenticated;
GRANT ALL ON public.session_reports TO service_role;

ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

-- Students can create reports for their sessions
CREATE POLICY "Session reports student create" ON public.session_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_reports.session_id
      AND sessions.student_id = auth.uid()
    )
  );

-- Students can read their own reports
CREATE POLICY "Session reports student read" ON public.session_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_reports.session_id
      AND sessions.student_id = auth.uid()
    )
  );

-- Mentors can read reports for their sessions
CREATE POLICY "Session reports mentor read" ON public.session_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_reports.session_id
      AND sessions.mentor_id = auth.uid()
    )
  );

-- Mentors can update reports for their sessions (add response)
CREATE POLICY "Session reports mentor update" ON public.session_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_reports.session_id
      AND sessions.mentor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = session_reports.session_id
      AND sessions.mentor_id = auth.uid()
    )
  );

-- Admins can manage all reports
CREATE POLICY "Session reports admin manage" ON public.session_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Create indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_student_id ON public.sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor_id ON public.sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_time ON public.sessions(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_mentor_assignment_logs_session_id ON public.mentor_assignment_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_mentor_assignment_logs_mentor_id ON public.mentor_assignment_logs(mentor_id);
CREATE INDEX IF NOT EXISTS idx_session_extensions_session_id ON public.session_extensions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_session_id ON public.session_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_status ON public.session_reports(status);

-- ============================================================
-- 6. Enable Realtime for new tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_assignment_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_extensions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_reports;

-- ============================================================
-- 7. Create function to log assignment
-- ============================================================
CREATE OR REPLACE FUNCTION log_mentor_assignment(
  p_session_id uuid,
  p_mentor_id uuid,
  p_action text,
  p_notes text DEFAULT NULL,
  p_performed_by uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.mentor_assignment_logs (
    session_id,
    mentor_id,
    action,
    notes,
    performed_by
  ) VALUES (
    p_session_id,
    p_mentor_id,
    p_action,
    p_notes,
    p_performed_by
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. Create function to check mentor availability
-- ============================================================
CREATE OR REPLACE FUNCTION check_mentor_availability(
  p_mentor_id uuid,
  p_scheduled_time timestamptz,
  p_duration_mins integer
)
RETURNS boolean AS $$
DECLARE
  v_session_end timestamptz;
  v_conflict_count integer;
BEGIN
  v_session_end := p_scheduled_time + (p_duration_mins || ' minutes')::interval;

  -- Check for overlapping sessions
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.sessions
  WHERE mentor_id = p_mentor_id
    AND status IN ('confirmed', 'in_progress', 'pending_mentor_response')
    AND scheduled_time < v_session_end
    AND scheduled_time + (duration_mins || ' minutes')::interval > p_scheduled_time;

  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql;