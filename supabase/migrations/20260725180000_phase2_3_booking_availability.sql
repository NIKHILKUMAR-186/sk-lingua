-- Phase 2.3: Booking availability, booking history, notification enhancements
BEGIN;

-- Availability slots per mentor (weekly schedule)
CREATE TABLE IF NOT EXISTS availability_slots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  label text,
  is_blocked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS availability_slots_mentor_idx ON availability_slots (mentor_id);
CREATE INDEX IF NOT EXISTS availability_slots_mentor_day_idx ON availability_slots (mentor_id, day);

-- Booking history to track actions against a booking
CREATE TABLE IF NOT EXISTS booking_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS booking_history_booking_idx ON booking_history (booking_id);

-- Extend notifications with metadata fields used by the booking system
ALTER TABLE IF EXISTS notifications
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS related_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Row level security policies
ALTER TABLE IF EXISTS availability_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS availability_owner ON availability_slots FOR ALL
  USING (mentor_id = auth.uid()) WITH CHECK (mentor_id = auth.uid());

ALTER TABLE IF EXISTS booking_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS booking_history_insert ON booking_history FOR INSERT
  USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS notifications_user ON notifications FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMIT;
