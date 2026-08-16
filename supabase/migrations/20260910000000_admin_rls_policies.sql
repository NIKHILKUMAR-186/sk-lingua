-- ============================================================
-- Admin RLS Policies for Student/Subscription Management
-- ============================================================
-- This migration adds admin-level RLS policies so that users
-- with the admin role can read/update student-facing data
-- without bypassing RLS via service_role.
-- ============================================================

-- ============================================================
-- 1. student_subscriptions — admin can read/update all
-- ============================================================

DROP POLICY IF EXISTS "student_subscriptions_admin_read" ON public.student_subscriptions;
CREATE POLICY "student_subscriptions_admin_read"
  ON public.student_subscriptions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "student_subscriptions_admin_update" ON public.student_subscriptions;
CREATE POLICY "student_subscriptions_admin_update"
  ON public.student_subscriptions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. sessions — admin can read/update all
-- ============================================================

DROP POLICY IF EXISTS "sessions_admin_read" ON public.sessions;
CREATE POLICY "sessions_admin_read"
  ON public.sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "sessions_admin_update" ON public.sessions;
CREATE POLICY "sessions_admin_update"
  ON public.sessions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. demo_session_bookings — admin can read/update all
-- ============================================================

DROP POLICY IF EXISTS "demo_bookings_admin_read" ON public.demo_session_bookings;
CREATE POLICY "demo_bookings_admin_read"
  ON public.demo_session_bookings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "demo_bookings_admin_update" ON public.demo_session_bookings;
CREATE POLICY "demo_bookings_admin_update"
  ON public.demo_session_bookings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. support_tickets — admin can read/update all
-- ============================================================

DROP POLICY IF EXISTS "support_tickets_admin_read" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_read"
  ON public.support_tickets
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "support_tickets_admin_update" ON public.support_tickets;
CREATE POLICY "support_tickets_admin_update"
  ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. ticket_replies — admin can read/update all
-- ============================================================

DROP POLICY IF EXISTS "ticket_replies_admin_read" ON public.ticket_replies;
CREATE POLICY "ticket_replies_admin_read"
  ON public.ticket_replies
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "ticket_replies_admin_update" ON public.ticket_replies;
CREATE POLICY "ticket_replies_admin_update"
  ON public.ticket_replies
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 6. payment_orders — admin can read all
-- ============================================================

DROP POLICY IF EXISTS "payment_orders_admin_read" ON public.payment_orders;
CREATE POLICY "payment_orders_admin_read"
  ON public.payment_orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 7. subscription_history — admin can read all
-- ============================================================

DROP POLICY IF EXISTS "subscription_history_admin_read" ON public.subscription_history;
CREATE POLICY "subscription_history_admin_read"
  ON public.subscription_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
