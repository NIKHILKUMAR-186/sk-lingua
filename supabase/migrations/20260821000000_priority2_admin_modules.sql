-- ============================================================
-- Priority-2 Admin Modules: Notification Broadcast, Support Tickets, Audit Logs
-- ============================================================

-- ============================================================
-- 1. Extend notifications table for broadcast support
-- ============================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS read boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS kind text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS related_id text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS broadcast_id uuid,
  ADD COLUMN IF NOT EXISTS target_role text,
  ADD COLUMN IF NOT EXISTS target_state text,
  ADD COLUMN IF NOT EXISTS target_language text,
  ADD COLUMN IF NOT EXISTS target_plan_id uuid;

-- Drop legacy columns if they exist
ALTER TABLE public.notifications DROP COLUMN IF EXISTS type;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS payload;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS is_read;

-- ============================================================
-- 2. Create notification_broadcasts table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  link text,
  category text DEFAULT 'general',
  kind text DEFAULT 'broadcast',
  priority text DEFAULT 'normal',
  target_type text NOT NULL, -- 'all', 'students', 'mentors', 'individual', 'state', 'language', 'plan'
  target_role text,
  target_state text,
  target_language text,
  target_plan_id uuid,
  target_user_ids uuid[],
  expires_at timestamptz,
  scheduled_at timestamptz,
  sent_at timestamptz,
  status text DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
  total_recipients integer DEFAULT 0,
  total_delivered integer DEFAULT 0,
  total_read integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notification_broadcasts TO authenticated;
GRANT ALL ON public.notification_broadcasts TO service_role;
ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Broadcasts admin manage" ON public.notification_broadcasts;
CREATE POLICY "Broadcasts admin manage" ON public.notification_broadcasts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. Create support_tickets table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL, -- 'technical', 'billing', 'scheduling', 'mentor_quality', 'other'
  priority text NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status text NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id),
  internal_notes text,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tickets creator read" ON public.support_tickets;
CREATE POLICY "Tickets creator read" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Tickets creator update" ON public.support_tickets;
CREATE POLICY "Tickets creator update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Tickets admin manage" ON public.support_tickets;
CREATE POLICY "Tickets admin manage" ON public.support_tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. Create ticket_replies table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_internal boolean DEFAULT false,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ticket_replies TO authenticated;
GRANT ALL ON public.ticket_replies TO service_role;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Replies ticket participants" ON public.ticket_replies;
CREATE POLICY "Replies ticket participants" ON public.ticket_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_replies.ticket_id
        AND (st.created_by = auth.uid() OR st.assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Replies creator insert" ON public.ticket_replies;
CREATE POLICY "Replies creator insert" ON public.ticket_replies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Replies admin manage" ON public.ticket_replies;
CREATE POLICY "Replies admin manage" ON public.ticket_replies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Enhance audit_logs table
-- ============================================================
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS target_entity text,
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- ============================================================
-- 6. Create ticket_number sequence
-- ============================================================
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  v_num text;
BEGIN
  SELECT 'TKT-' || LPAD((COUNT(*) + 1)::text, 6, '0') INTO v_num
  FROM public.support_tickets;
  RETURN v_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. Create trigger for ticket_number
-- ============================================================
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_ticket_number ON public.support_tickets;
CREATE TRIGGER trg_set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- ============================================================
-- 8. Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_broadcast ON public.notifications(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_notification_broadcasts_status ON public.notification_broadcasts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_by ON public.support_tickets(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON public.ticket_replies(ticket_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_scope_action ON public.audit_logs(scope, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_entity, target_id);