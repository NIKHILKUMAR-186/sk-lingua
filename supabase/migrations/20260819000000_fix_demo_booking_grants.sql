-- ============================================================
-- Fix missing GRANT privileges for PHASE3 student platform tables
-- The tables were created with RLS enabled but never granted
-- table-level privileges to the authenticated role.
-- ============================================================

-- demo_session_bookings - the main culprit for the booking error
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_session_bookings TO authenticated;
GRANT ALL ON public.demo_session_bookings TO service_role;

-- payment_orders - needed for the payment flow after booking
GRANT SELECT, INSERT, UPDATE ON public.payment_orders TO authenticated;
GRANT ALL ON public.payment_orders TO service_role;

-- payment_history - needed for recording completed payments
GRANT SELECT, INSERT ON public.payment_history TO authenticated;
GRANT ALL ON public.payment_history TO service_role;

-- session_slots - needed for booking form to read available slots
GRANT SELECT ON public.session_slots TO authenticated;
GRANT ALL ON public.session_slots TO service_role;

-- slot_bookings - needed for booking a slot
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slot_bookings TO authenticated;
GRANT ALL ON public.slot_bookings TO service_role;

-- subscription_plans - needed to read demo plan price dynamically
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT SELECT ON public.subscription_plans TO anon;

-- student_subscriptions - needed for subscription management
GRANT SELECT, INSERT, UPDATE ON public.student_subscriptions TO authenticated;
GRANT ALL ON public.student_subscriptions TO service_role;

-- subscription_history - needed for tracking subscriptions
GRANT SELECT, INSERT ON public.subscription_history TO authenticated;
GRANT ALL ON public.subscription_history TO service_role;

-- notification_preferences - needed for user preferences
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

-- student_onboarding_progress - needed for onboarding
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_onboarding_progress TO authenticated;
GRANT ALL ON public.student_onboarding_progress TO service_role;

-- ============================================================
-- Also fix grants for demo conversion tables created later
-- that might reference these tables in RLS policies
-- ============================================================
-- demo_assignment_history (already has grants but ensure DELETE for admin flows)
GRANT SELECT, INSERT, UPDATE ON public.demo_assignment_history TO authenticated;
GRANT ALL ON public.demo_assignment_history TO service_role;