-- Fix homeworks row-level security to allow only the session mentor or admin to manage homework rows.
BEGIN;

DROP POLICY IF EXISTS "Homeworks visible to session participants" ON public.homeworks;
DROP POLICY IF EXISTS "Mentors manage homeworks" ON public.homeworks;
-- Ensure any previously created policies (by name) are dropped so this migration is idempotent
DROP POLICY IF EXISTS "Mentors insert homeworks" ON public.homeworks;
DROP POLICY IF EXISTS "Homeworks select for mentor or student" ON public.homeworks;
DROP POLICY IF EXISTS "Mentors update homeworks" ON public.homeworks;
DROP POLICY IF EXISTS "Homeworks delete by creator or admin" ON public.homeworks;
DROP POLICY IF EXISTS "Homeworks visible to session participants" ON public.homeworks;
DROP POLICY IF EXISTS "Mentors manage homeworks" ON public.homeworks;
DROP POLICY IF EXISTS "Timeline visible to participants" ON public.session_timeline;
DROP POLICY IF EXISTS "Participants create timeline" ON public.session_timeline;

CREATE POLICY "Mentors insert homeworks" ON public.homeworks
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      mentor_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = session_id
          AND s.mentor_id = auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Homeworks select for mentor or student" ON public.homeworks
  FOR SELECT TO authenticated
  USING (
    mentor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = homeworks.session_id
        AND s.student_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Mentors update homeworks" ON public.homeworks
  FOR UPDATE TO authenticated
  USING (
    mentor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    mentor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Homeworks delete by creator or admin" ON public.homeworks
  FOR DELETE TO authenticated
  USING (
    mentor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Timeline visible to participants" ON public.session_timeline
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_timeline.session_id
        AND (s.student_id = auth.uid() OR s.mentor_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Participants create timeline" ON public.session_timeline
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_timeline.session_id
        AND (s.student_id = auth.uid() OR s.mentor_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

COMMIT;
