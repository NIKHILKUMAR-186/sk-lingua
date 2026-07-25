ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS homework_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS homework_status text CHECK (homework_status IN ('pending', 'in_progress', 'submitted', 'completed')),
  ADD COLUMN IF NOT EXISTS homework_notes text,
  ADD COLUMN IF NOT EXISTS homework_attachment_url text;

CREATE INDEX IF NOT EXISTS idx_resources_homework
  ON public.resources(homework_status, session_id, mentor_id);
