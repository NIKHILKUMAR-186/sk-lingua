CREATE TYPE public.homework_status AS ENUM ('Assigned', 'In Progress', 'Submitted', 'Reviewed', 'Completed', 'Late');

CREATE TABLE IF NOT EXISTS public.homeworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  deadline timestamptz,
  difficulty text,
  estimated_time_mins int DEFAULT 30,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.homework_status NOT NULL DEFAULT 'Assigned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id uuid NOT NULL REFERENCES public.homeworks(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_text text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.homework_status NOT NULL DEFAULT 'Submitted',
  submitted_at timestamptz,
  mentor_feedback text,
  mentor_score int,
  corrections text,
  mentor_feedback_attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  note_type text NOT NULL CHECK (note_type IN ('mentor_private', 'shared', 'student_private')),
  title text,
  body text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  detail text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homeworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_timeline ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homeworks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_timeline TO authenticated;
GRANT ALL ON public.homeworks TO service_role;
GRANT ALL ON public.homework_submissions TO service_role;
GRANT ALL ON public.session_notes TO service_role;
GRANT ALL ON public.session_timeline TO service_role;

CREATE POLICY "Homeworks visible to session participants" ON public.homeworks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = homeworks.session_id AND (s.student_id = auth.uid() OR s.mentor_id = auth.uid())));
CREATE POLICY "Mentors manage homeworks" ON public.homeworks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = homeworks.session_id AND s.mentor_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = homeworks.session_id AND s.mentor_id = auth.uid()));

CREATE POLICY "Submissions visible to session participants" ON public.homework_submissions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.homeworks h JOIN public.sessions s ON s.id = h.session_id WHERE h.id = homework_submissions.homework_id AND (s.student_id = auth.uid() OR s.mentor_id = auth.uid())));
CREATE POLICY "Students create submissions" ON public.homework_submissions FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());
CREATE POLICY "Mentors update submissions" ON public.homework_submissions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.homeworks h JOIN public.sessions s ON s.id = h.session_id WHERE h.id = homework_submissions.homework_id AND s.mentor_id = auth.uid()));

CREATE POLICY "Notes visible by role" ON public.session_notes FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_notes.session_id AND (s.student_id = auth.uid() OR s.mentor_id = auth.uid()))
  AND (
    note_type = 'shared'
    OR (note_type = 'mentor_private' AND EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_notes.session_id AND s.mentor_id = auth.uid()))
    OR (note_type = 'student_private' AND EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_notes.session_id AND s.student_id = auth.uid()))
  )
);
CREATE POLICY "Mentors manage notes" ON public.session_notes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_notes.session_id AND s.mentor_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_notes.session_id AND s.mentor_id = auth.uid()));

CREATE POLICY "Timeline visible to participants" ON public.session_timeline FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_timeline.session_id AND (s.student_id = auth.uid() OR s.mentor_id = auth.uid())));
CREATE POLICY "Participants create timeline" ON public.session_timeline FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_timeline.session_id AND (s.student_id = auth.uid() OR s.mentor_id = auth.uid())));

CREATE INDEX IF NOT EXISTS idx_homeworks_session ON public.homeworks(session_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_homework ON public.homework_submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_session ON public.session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_timeline_session ON public.session_timeline(session_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('session-files', 'session-files', true)
ON CONFLICT (id) DO NOTHING;
