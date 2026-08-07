-- Add session_requests table for student-initiated bookings pending admin assignment
CREATE TABLE IF NOT EXISTS public.session_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_mentor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  scheduled_time timestamptz NOT NULL,
  duration_mins int NOT NULL DEFAULT 30,
  topic text,
  language text,
  status text NOT NULL DEFAULT 'pending_admin_assignment',
  confirmed_at timestamptz,
  mentor_response_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_requests TO authenticated;
GRANT ALL ON public.session_requests TO service_role;
ALTER TABLE public.session_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students create session requests" ON public.session_requests;
DROP POLICY IF EXISTS "Students read own session requests" ON public.session_requests;
DROP POLICY IF EXISTS "Students update own session requests" ON public.session_requests;
CREATE POLICY "Students create session requests" ON public.session_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students read own session requests" ON public.session_requests FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Students update own session requests" ON public.session_requests FOR UPDATE TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
-- CREATE TRIGGER trg_session_requests_updated BEFORE UPDATE ON public.session_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Recreate updated_at trigger safely
DROP TRIGGER IF EXISTS trg_session_requests_updated
ON public.session_requests;

CREATE TRIGGER trg_session_requests_updated
BEFORE UPDATE ON public.session_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();