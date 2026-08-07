-- ============================================================
-- Demo Session Conversion System — Phase 7
-- Extends demo session booking with conversion workflow
-- ============================================================

-- ============================================================
-- 1. Extend demo_session_bookings with conversion fields
-- ============================================================
ALTER TABLE public.demo_session_bookings
  ADD COLUMN IF NOT EXISTS learning_goal text,
  ADD COLUMN IF NOT EXISTS mentor_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedback_provided boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_to_subscription boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_id uuid,
  ADD COLUMN IF NOT EXISTS demo_workspace_id text;

-- ============================================================
-- 2. Create demo_assignment_history table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.demo_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.demo_session_bookings(id) ON DELETE CASCADE,
  mentor_id uuid REFERENCES auth.users(id),
  action text NOT NULL, -- 'assigned', 'accepted', 'rejected', 'auto_reassigned'
  notes text,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.demo_assignment_history TO authenticated;
GRANT ALL ON public.demo_assignment_history TO service_role;

ALTER TABLE public.demo_assignment_history ENABLE ROW LEVEL SECURITY;

-- Admins can manage assignment history
CREATE POLICY "Demo assignment history admin manage" ON public.demo_assignment_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Mentors can read their own assignments
CREATE POLICY "Demo assignment history mentor read" ON public.demo_assignment_history
  FOR SELECT TO authenticated
  USING (mentor_id = auth.uid());

-- Students can read their own booking assignments
CREATE POLICY "Demo assignment history student read" ON public.demo_assignment_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demo_session_bookings dsb
      WHERE dsb.id = demo_assignment_history.booking_id
        AND dsb.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Create demo_session_workspaces table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.demo_session_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.demo_session_bookings(id) ON DELETE CASCADE,
  mentor_id uuid REFERENCES auth.users(id),
  student_id uuid REFERENCES auth.users(id),
  video_call_url text,
  chat_enabled boolean DEFAULT true,
  screen_share_enabled boolean DEFAULT false,
  session_notes text,
  status text DEFAULT 'active', -- 'active', 'ended'
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.demo_session_workspaces TO authenticated;
GRANT ALL ON public.demo_session_workspaces TO service_role;

ALTER TABLE public.demo_session_workspaces ENABLE ROW LEVEL SECURITY;

-- Mentor can access their own workspace
CREATE POLICY "Demo workspace mentor access" ON public.demo_session_workspaces
  FOR ALL TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- Student can access their own workspace
CREATE POLICY "Demo workspace student access" ON public.demo_session_workspaces
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Admins can access all workspaces
CREATE POLICY "Demo workspace admin access" ON public.demo_session_workspaces
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. Create demo_session_resources table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.demo_session_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.demo_session_workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  file_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.demo_session_resources TO authenticated;
GRANT ALL ON public.demo_session_resources TO service_role;

ALTER TABLE public.demo_session_resources ENABLE ROW LEVEL SECURITY;

-- Mentor can upload resources
CREATE POLICY "Demo resources mentor upload" ON public.demo_session_resources
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demo_session_workspaces dw
      WHERE dw.id = demo_session_resources.workspace_id
        AND dw.mentor_id = auth.uid()
    )
  );

-- Student can read resources
CREATE POLICY "Demo resources student read" ON public.demo_session_resources
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demo_session_workspaces dw
      WHERE dw.id = demo_session_resources.workspace_id
        AND dw.student_id = auth.uid()
    )
  );

-- ============================================================
-- 5. Create demo_feedback table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.demo_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.demo_session_bookings(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback_text text,
  would_recommend boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.demo_feedback TO authenticated;
GRANT ALL ON public.demo_feedback TO service_role;

ALTER TABLE public.demo_feedback ENABLE ROW LEVEL SECURITY;

-- Student can submit feedback
CREATE POLICY "Demo feedback student submit" ON public.demo_feedback
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Student can read their own feedback
CREATE POLICY "Demo feedback student read" ON public.demo_feedback
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- ============================================================
-- 6. RLS policies for demo_session_bookings
-- ============================================================
-- Student can read their own bookings
CREATE POLICY "Demo bookings student read" ON public.demo_session_bookings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Student can create their own bookings
CREATE POLICY "Demo bookings student create" ON public.demo_session_bookings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Mentor can read assigned bookings
CREATE POLICY "Demo bookings mentor read" ON public.demo_session_bookings
  FOR SELECT TO authenticated
  USING (mentor_id = auth.uid());

-- Mentor can update booking status
CREATE POLICY "Demo bookings mentor update" ON public.demo_session_bookings
  FOR UPDATE TO authenticated
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- Admins can manage all bookings
CREATE POLICY "Demo bookings admin manage" ON public.demo_session_bookings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 7. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_demo_bookings_user
  ON public.demo_session_bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_mentor
  ON public.demo_session_bookings (mentor_id);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_status
  ON public.demo_session_bookings (booking_status);
CREATE INDEX IF NOT EXISTS idx_demo_bookings_date
  ON public.demo_session_bookings (booking_date);
CREATE INDEX IF NOT EXISTS idx_demo_assignment_booking
  ON public.demo_assignment_history (booking_id);
CREATE INDEX IF NOT EXISTS idx_demo_workspace_booking
  ON public.demo_session_workspaces (booking_id);
CREATE INDEX IF NOT EXISTS idx_demo_resources_workspace
  ON public.demo_session_resources (workspace_id);
CREATE INDEX IF NOT EXISTS idx_demo_feedback_booking
  ON public.demo_feedback (booking_id);