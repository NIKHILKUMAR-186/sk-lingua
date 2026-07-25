-- Add helpful indexes for sessions and notifications
BEGIN;

-- Index to speed queries by mentor and scheduled time
CREATE INDEX IF NOT EXISTS idx_sessions_mentor_scheduled ON public.sessions (mentor_id, scheduled_time);

-- Index to speed queries by student and scheduled time
CREATE INDEX IF NOT EXISTS idx_sessions_student_scheduled ON public.sessions (student_id, scheduled_time);

-- Index to speed notification listing by user and read state
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created_at ON public.notifications (user_id, read, created_at DESC);

COMMIT;
