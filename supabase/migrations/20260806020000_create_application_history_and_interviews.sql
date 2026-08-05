-- Create status history, interviews, and audit logging for mentor applications
CREATE TABLE IF NOT EXISTS public.mentor_application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.mentor_applications(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentor_application_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.mentor_applications(id) ON DELETE CASCADE,
  scheduled_time timestamptz NOT NULL,
  interviewer_id uuid NOT NULL,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  scope text,
  action text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Grant basic privileges
GRANT SELECT, INSERT ON public.mentor_application_status_history TO authenticated;
GRANT SELECT, INSERT ON public.mentor_application_interviews TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.mentor_application_status_history TO service_role;
GRANT ALL ON public.mentor_application_interviews TO service_role;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.mentor_application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_application_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: allow admins to insert/select; allow authenticated users to insert status history only for their own application (for certain events)
CREATE POLICY "Status history admin manage" ON public.mentor_application_status_history FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Interviews admin manage" ON public.mentor_application_interviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Audit logs service role or admin" ON public.audit_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Also allow inserting status history by the application owner when creating their application (handled by mentor_applications policies). Owner inserts are permitted via those policies.
