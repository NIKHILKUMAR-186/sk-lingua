-- ============================================================
-- PHASE 3: STUDENT PLATFORM - SUBSCRIPTIONS, DEMO BOOKING, PAYMENTS
-- ============================================================

-- 1. SUBSCRIPTION PLANS (System-wide pricing plans)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- "Single Session", "Weekly", "Monthly"
  description text,
  price numeric(10, 2) NOT NULL, -- in rupees (₹)
  currency text DEFAULT 'INR',
  billing_cycle text NOT NULL, -- "once", "weekly", "monthly", "quarterly", "yearly"
  num_sessions integer NOT NULL, -- number of sessions included
  validity_days integer, -- days the subscription is valid (NULL = permanent)
  features jsonb DEFAULT '[]'::jsonb, -- array of features
  recommended boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, billing_cycle)
);

-- 2. STUDENT SUBSCRIPTIONS (Active subscriptions for each student)
CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status text DEFAULT 'active', -- "active", "expired", "cancelled", "pending"
  current_session_slots integer NOT NULL, -- remaining slots
  total_session_slots integer NOT NULL, -- total purchased slots
  used_session_slots integer NOT NULL DEFAULT 0, -- slots used
  purchased_at timestamptz DEFAULT now(),
  activated_at timestamptz,
  expires_at timestamptz,
  renewed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  metadata jsonb, -- store additional data
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. DEMO SESSION BOOKINGS
CREATE TABLE IF NOT EXISTS public.demo_session_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  booking_time_start time NOT NULL,
  booking_time_end time NOT NULL,
  language text NOT NULL, -- learning language selected
  duration_mins integer DEFAULT 30,
  payment_status text DEFAULT 'pending', -- "pending", "completed", "failed", "cancelled"
  booking_status text DEFAULT 'pending_assignment', -- "pending_assignment", "confirmed", "completed", "cancelled"
  price numeric(10, 2) DEFAULT 9.00, -- ₹9 demo price
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. PAYMENT ORDERS (All payment records)
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_type text NOT NULL, -- "demo_session", "subscription", "renewal"
  related_id uuid, -- references demo_session_bookings.id or student_subscriptions.id
  amount numeric(10, 2) NOT NULL,
  tax_amount numeric(10, 2) DEFAULT 0,
  discount_amount numeric(10, 2) DEFAULT 0,
  final_amount numeric(10, 2) NOT NULL,
  currency text DEFAULT 'INR',
  payment_method text, -- "card", "upi", "wallet", "bank_transfer"
  payment_status text DEFAULT 'pending', -- "pending", "completed", "failed", "refunded"
  transaction_id text UNIQUE,
  gateway text, -- "razorpay", "stripe", etc (future)
  gateway_order_id text UNIQUE,
  gateway_response jsonb,
  billing_address jsonb,
  customer_email text,
  customer_phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 5. SESSION SLOTS (Available time slots for demo/booking)
CREATE TABLE IF NOT EXISTS public.session_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date date NOT NULL,
  slot_time_start time NOT NULL,
  slot_time_end time NOT NULL,
  capacity integer NOT NULL DEFAULT 1, -- max concurrent bookings
  booked_count integer NOT NULL DEFAULT 0, -- current bookings
  status text DEFAULT 'available', -- "available", "limited", "full"
  languages text[] DEFAULT '{}'::text[], -- languages available in this slot
  mentor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, -- assigned mentor (future)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(slot_date, slot_time_start, slot_time_end)
);

-- 6. SLOT BOOKINGS (Which student booked which slot)
CREATE TABLE IF NOT EXISTS public.slot_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.session_slots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id uuid, -- references demo_session_bookings.id or session.id
  booking_type text NOT NULL, -- "demo", "session"
  status text DEFAULT 'confirmed', -- "confirmed", "cancelled", "completed"
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(slot_id, user_id, booking_type)
);

-- 7. STUDENT NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  demo_updates boolean DEFAULT true,
  subscription_updates boolean DEFAULT true,
  account_updates boolean DEFAULT true,
  system_announcements boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  sms_notifications boolean DEFAULT false,
  push_notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. PAYMENT HISTORY (Denormalized view for student dashboard)
CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_order_id uuid NOT NULL REFERENCES public.payment_orders(id) ON DELETE CASCADE,
  transaction_type text NOT NULL, -- "purchase", "renewal", "refund"
  amount numeric(10, 2) NOT NULL,
  status text,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(payment_order_id, transaction_type)
);

-- 9. SUBSCRIPTION HISTORY (Track changes to subscriptions)
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.student_subscriptions(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- "purchased", "renewed", "upgraded", "downgraded", "cancelled", "expired"
  old_slots_remaining integer,
  new_slots_remaining integer,
  old_plan_id uuid,
  new_plan_id uuid,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 10. STUDENT ONBOARDING PROGRESS (Draft saves for multi-step onboarding)
CREATE TABLE IF NOT EXISTS public.student_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  step integer DEFAULT 1,
  progress_data jsonb, -- store form data for resume later
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_student_subscriptions_user_id 
  ON public.student_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_student_subscriptions_status 
  ON public.student_subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_student_subscriptions_expires 
  ON public.student_subscriptions(expires_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_demo_bookings_user_id 
  ON public.demo_session_bookings(user_id);

CREATE INDEX IF NOT EXISTS idx_demo_bookings_date 
  ON public.demo_session_bookings(booking_date, booking_time_start);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id 
  ON public.payment_orders(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_orders_status 
  ON public.payment_orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_payment_orders_transaction 
  ON public.payment_orders(transaction_id);

CREATE INDEX IF NOT EXISTS idx_session_slots_date 
  ON public.session_slots(slot_date, slot_time_start);

CREATE INDEX IF NOT EXISTS idx_session_slots_status 
  ON public.session_slots(slot_date, status);

CREATE INDEX IF NOT EXISTS idx_slot_bookings_user_id 
  ON public.slot_bookings(user_id);

CREATE INDEX IF NOT EXISTS idx_slot_bookings_slot_id 
  ON public.slot_bookings(slot_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id 
  ON public.payment_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id 
  ON public.subscription_history(user_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_session_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- subscription_plans: Anyone can read active plans
CREATE POLICY "subscription_plans_read" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- student_subscriptions: Users can only see their own
CREATE POLICY "student_subscriptions_user" ON public.student_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- demo_session_bookings: Users can only see their own
CREATE POLICY "demo_bookings_user" ON public.demo_session_bookings
  FOR ALL USING (auth.uid() = user_id);

-- payment_orders: Users can only see their own
CREATE POLICY "payment_orders_user" ON public.payment_orders
  FOR ALL USING (auth.uid() = user_id);

-- session_slots: Anyone can read public slots
CREATE POLICY "session_slots_read" ON public.session_slots
  FOR SELECT USING (status IN ('available', 'limited'));

-- slot_bookings: Users can see their own bookings
CREATE POLICY "slot_bookings_user" ON public.slot_bookings
  FOR SELECT USING (auth.uid() = user_id);

-- notification_preferences: Users can see their own
CREATE POLICY "notification_preferences_user" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- payment_history: Users can see their own
CREATE POLICY "payment_history_user" ON public.payment_history
  FOR SELECT USING (auth.uid() = user_id);

-- subscription_history: Users can see their own
CREATE POLICY "subscription_history_user" ON public.subscription_history
  FOR SELECT USING (auth.uid() = user_id);

-- student_onboarding_progress: Users can see their own
CREATE POLICY "onboarding_progress_user" ON public.student_onboarding_progress
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price, billing_cycle, num_sessions, validity_days, features, recommended, sort_order)
VALUES 
  ('Single Session', 'Perfect for trying out LINGUA', 500.00, 'once', 1, NULL, 
    '["1 session (30 min)", "Pay per use", "Flexible scheduling", "No commitment"]'::jsonb, 
    false, 1),
  ('Weekly Plan', 'Learn consistently with weekly sessions', 1999.00, 'weekly', 4, 7, 
    '["4 sessions per week", "30 min each", "7-day validity", "Flexible scheduling"]'::jsonb, 
    false, 2),
  ('Monthly Plan', 'Our most popular choice', 7999.00, 'monthly', 22, 30, 
    '["22 sessions per month", "30 min each", "30-day validity", "Priority booking", "Best value"]'::jsonb, 
    true, 3),
  ('Quarterly Plan', 'Serious learners', 22999.00, 'quarterly', 66, 90, 
    '["66 sessions over 3 months", "30 min each", "90-day validity", "Premium support", "Rollover slots"]'::jsonb, 
    false, 4),
  ('Yearly Plan', 'Maximum commitment', 79999.00, 'yearly', 264, 365, 
    '["264 sessions per year", "30 min each", "365-day validity", "VIP support", "Free resources", "Priority booking"]'::jsonb, 
    false, 5)
ON CONFLICT (name, billing_cycle) DO NOTHING;

-- Insert demo session plan (system-wide)
INSERT INTO public.subscription_plans (name, description, price, billing_cycle, num_sessions, validity_days, features, is_active, sort_order)
VALUES 
  ('Demo Session', 'Get started with a 30-min demo', 9.00, 'once', 1, 1, 
    '["Demo with mentor", "30 minutes", "No commitment", "Money-back guarantee"]'::jsonb, 
    true, 0)
ON CONFLICT (name, billing_cycle) DO NOTHING;
