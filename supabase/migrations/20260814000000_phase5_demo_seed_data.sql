-- ============================================================
-- PHASE 5: DEMO SEED DATA (DEV/DEMO ONLY)
-- Creates realistic demo accounts and content so the app looks alive.
-- Idempotent + defensive: safe to run repeatedly; never duplicates data.
-- ============================================================

-- Ensure the profiles table has the country column (dev DB may be missing it)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;

-- Fixed UUIDs for deterministic references across tables
DO $$
DECLARE
  v_admin_id uuid := '00000000-0000-0000-0000-000000000001';
  v_mentor_fr uuid := '00000000-0000-0000-0000-000000000002';
  v_mentor_es uuid := '00000000-0000-0000-0000-000000000003';
  v_student_1 uuid := '00000000-0000-0000-0000-000000000004';
  v_student_2 uuid := '00000000-0000-0000-0000-000000000005';
  v_student_3 uuid := '00000000-0000-0000-0000-000000000006';
  v_session_1 uuid := '00000000-0000-0000-0000-000000000101';
  v_session_2 uuid := '00000000-0000-0000-0000-000000000102';
  v_session_3 uuid := '00000000-0000-0000-0000-000000000103';
  v_session_4 uuid := '00000000-0000-0000-0000-000000000104';
  v_gig_1 uuid := '00000000-0000-0000-0000-000000000201';
  v_gig_2 uuid := '00000000-0000-0000-0000-000000000202';
  v_gig_3 uuid := '00000000-0000-0000-0000-000000000203';
  v_plan_monthly uuid;
  v_plan_single uuid;
BEGIN
  -- ============================================================
  -- DEMO AUTH USERS
  -- Password: DemoPass123! (bcrypt-hashed)
  -- ============================================================
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES
    (v_admin_id,   'admin@lingua.demo',   crypt('DemoPass123!', gen_salt('bf')), now(), jsonb_build_object('full_name', 'Admin LINGUA'), now(), now()),
    (v_mentor_fr,  'mentor.french@lingua.demo', crypt('DemoPass123!', gen_salt('bf')), now(), jsonb_build_object('full_name', 'Camille Dubois'), now(), now()),
    (v_mentor_es,  'mentor.spanish@lingua.demo', crypt('DemoPass123!', gen_salt('bf')), now(), jsonb_build_object('full_name', 'Diego Martinez'), now(), now()),
    (v_student_1,  'student.one@lingua.demo', crypt('DemoPass123!', gen_salt('bf')), now(), jsonb_build_object('full_name', 'Aarav Sharma'), now(), now()),
    (v_student_2,  'student.two@lingua.demo', crypt('DemoPass123!', gen_salt('bf')), now(), jsonb_build_object('full_name', 'Priya Patel'), now(), now()),
    (v_student_3,  'student.three@lingua.demo', crypt('DemoPass123!', gen_salt('bf')), now(), jsonb_build_object('full_name', 'Rahul Verma'), now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- DEMO PROFILES
  -- ============================================================
  INSERT INTO public.profiles (id, full_name, email, avatar_url, country, native_language, bio, onboarded, created_at, updated_at)
  VALUES
    (v_admin_id,   'Admin LINGUA',     'admin@lingua.demo',       NULL, 'India', 'en', 'Platform administrator for LINGUA.', true, now(), now()),
    (v_mentor_fr,  'Camille Dubois',   'mentor.french@lingua.demo', NULL, 'France', 'fr', 'Native French speaker with 8+ years teaching experience.', true, now(), now()),
    (v_mentor_es,  'Diego Martinez',   'mentor.spanish@lingua.demo', NULL, 'Spain', 'es', 'Certified Spanish tutor. I make learning fun and practical.', true, now(), now()),
    (v_student_1,  'Aarav Sharma',     'student.one@lingua.demo',   NULL, 'India', 'hi', 'Learning French for an upcoming move to Paris.', true, now(), now()),
    (v_student_2,  'Priya Patel',      'student.two@lingua.demo',   NULL, 'India', 'gu', 'Spanish learner who loves culture and travel.', true, now(), now()),
    (v_student_3,  'Rahul Verma',      'student.three@lingua.demo', NULL, 'India', 'en', 'Beginner in French, looking to build a strong foundation.', true, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- DEMO USER ROLES
  -- ============================================================
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES
    (v_admin_id,   'admin', now()),
    (v_mentor_fr,  'mentor', now()),
    (v_mentor_es,  'mentor', now()),
    (v_student_1,  'student', now()),
    (v_student_2,  'student', now()),
    (v_student_3,  'student', now())
  ON CONFLICT (user_id, role) DO NOTHING;

  -- ============================================================
  -- DEMO MENTOR PROFILES
  -- ============================================================
  INSERT INTO public.mentor_profiles (user_id, headline, bio, languages_taught, certifications, hourly_rate, years_experience, rating_avg, total_reviews, availability, is_active, created_at, updated_at)
  VALUES
    (v_mentor_fr, 'Native French Tutor', 'Bonjour! I am a native French speaker from Paris with a passion for helping students speak with confidence.', ARRAY['French'], ARRAY['DELF B2', 'University of Sorbonne'], 1200.00, 8, 4.9, 34, '{"monday":["09:00-12:00"],"wednesday":["14:00-18:00"]}'::jsonb, true, now(), now()),
    (v_mentor_es, 'Conversational Spanish Coach', 'Hola! I help students become conversational in Spanish through practical, real-world lessons.', ARRAY['Spanish'], ARRAY['ELE Certificate', 'Instituto Cervantes'], 1000.00, 6, 4.8, 27, '{"tuesday":["10:00-13:00"],"thursday":["15:00-19:00"]}'::jsonb, true, now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  -- ============================================================
  -- DEMO GIGS (fixed UUIDs for idempotency)
  -- ============================================================
  INSERT INTO public.gigs (id, mentor_id, title, description, language, duration_mins, price, tags, is_active, created_at, updated_at)
  VALUES
    (v_gig_1, v_mentor_fr, 'French Conversation Practice', '30-minute guided conversation practice focused on fluency and pronunciation.', 'French', 30, 500.00, ARRAY['Beginner','Conversation','Pronunciation'], true, now(), now()),
    (v_gig_2, v_mentor_fr, 'French for Travel', 'Practical French phrases and cultural tips for your next trip to France.', 'French', 30, 600.00, ARRAY['Travel','Practical','Culture'], true, now(), now()),
    (v_gig_3, v_mentor_es, 'Spanish Fundamentals', 'Build a strong foundation in Spanish grammar, vocabulary, and sentence structure.', 'Spanish', 30, 450.00, ARRAY['Beginner','Grammar','Vocabulary'], true, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- DEMO SUBSCRIPTION PLANS (reference existing plans)
  -- ============================================================
  IF to_regclass('public.subscription_plans') IS NOT NULL THEN
    SELECT id INTO v_plan_monthly FROM public.subscription_plans WHERE name = 'Monthly Plan' AND billing_cycle = 'monthly' LIMIT 1;
    SELECT id INTO v_plan_single FROM public.subscription_plans WHERE name = 'Single Session' AND billing_cycle = 'once' LIMIT 1;
  END IF;

  -- ============================================================
  -- DEMO STUDENT SUBSCRIPTIONS (existence check for idempotency)
  -- ============================================================
  IF to_regclass('public.student_subscriptions') IS NOT NULL AND v_plan_monthly IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.student_subscriptions WHERE user_id = v_student_1
    ) THEN
      INSERT INTO public.student_subscriptions (user_id, plan_id, status, current_session_slots, total_session_slots, used_session_slots, purchased_at, activated_at, expires_at, created_at, updated_at)
      VALUES
        (v_student_1, v_plan_monthly, 'active', 22, 22, 0, now() - interval '5 days', now() - interval '5 days', now() + interval '25 days', now() - interval '5 days', now());
    END IF;
  END IF;

  -- ============================================================
  -- DEMO SESSIONS (fixed UUIDs for idempotency)
  -- ============================================================
  INSERT INTO public.sessions (id, student_id, mentor_id, scheduled_time, duration_mins, status, video_call_link, notes, created_at, updated_at)
  VALUES
    (v_session_1, v_student_1, v_mentor_fr, now() - interval '3 days', 30, 'completed', 'https://meet.google.com/demo-fr-1', 'Intro session - greetings and introductions.', now() - interval '4 days', now() - interval '3 days'),
    (v_session_2, v_student_1, v_mentor_fr, now() - interval '1 day', 30, 'completed', 'https://meet.google.com/demo-fr-2', 'Practice - ordering food at a restaurant.', now() - interval '2 days', now() - interval '1 day'),
    (v_session_3, v_student_2, v_mentor_es, now() - interval '2 days', 30, 'completed', 'https://meet.google.com/demo-es-1', 'Basics - alphabet and common phrases.', now() - interval '3 days', now() - interval '2 days'),
    (v_session_4, v_student_3, v_mentor_fr, now() + interval '2 days', 30, 'pending', NULL, 'Scheduled - numbers and time.', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- DEMO SESSION REQUESTS (existence check for idempotency)
  -- ============================================================
  IF to_regclass('public.session_requests') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.session_requests WHERE student_id = v_student_1 AND topic = 'French greetings'
    ) THEN
      INSERT INTO public.session_requests (student_id, assigned_mentor, scheduled_time, duration_mins, topic, language, status, created_at, updated_at)
      VALUES
        (v_student_1, v_mentor_fr, now() - interval '3 days', 30, 'French greetings', 'French', 'confirmed', now() - interval '5 days', now() - interval '3 days');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.session_requests WHERE student_id = v_student_2 AND topic = 'Spanish alphabet'
    ) THEN
      INSERT INTO public.session_requests (student_id, assigned_mentor, scheduled_time, duration_mins, topic, language, status, created_at, updated_at)
      VALUES
        (v_student_2, v_mentor_es, now() - interval '2 days', 30, 'Spanish alphabet', 'Spanish', 'confirmed', now() - interval '4 days', now() - interval '2 days');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.session_requests WHERE student_id = v_student_3 AND topic = 'Numbers and time'
    ) THEN
      INSERT INTO public.session_requests (student_id, assigned_mentor, scheduled_time, duration_mins, topic, language, status, created_at, updated_at)
      VALUES
        (v_student_3, v_mentor_fr, now() + interval '2 days', 30, 'Numbers and time', 'French', 'pending_admin_assignment', now() - interval '1 day', now());
    END IF;
  END IF;

  -- ============================================================
  -- DEMO REVIEWS (existence check for idempotency)
  -- ============================================================
  IF NOT EXISTS (
    SELECT 1 FROM public.reviews WHERE student_id = v_student_1 AND mentor_id = v_mentor_fr AND rating = 5
  ) THEN
    INSERT INTO public.reviews (session_id, student_id, mentor_id, rating, comment, created_at)
    SELECT s.id, v_student_1, v_mentor_fr, 5, 'Camille is an amazing teacher! Very patient and explains everything clearly.', now() - interval '3 days'
    FROM public.sessions s WHERE s.student_id = v_student_1 AND s.mentor_id = v_mentor_fr AND s.status = 'completed' LIMIT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.reviews WHERE student_id = v_student_2 AND mentor_id = v_mentor_es AND rating = 4
  ) THEN
    INSERT INTO public.reviews (session_id, student_id, mentor_id, rating, comment, created_at)
    SELECT s.id, v_student_2, v_mentor_es, 4, 'Great conversational practice. Diego makes it fun and engaging.', now() - interval '2 days'
    FROM public.sessions s WHERE s.student_id = v_student_2 AND s.mentor_id = v_mentor_es AND s.status = 'completed' LIMIT 1;
  END IF;

  -- ============================================================
  -- DEMO NOTIFICATIONS (existence check for idempotency)
  -- ============================================================
  IF NOT EXISTS (
    SELECT 1 FROM public.notifications WHERE user_id = v_student_1 AND title = 'Welcome to LINGUA! 🎉'
  ) THEN
    INSERT INTO public.notifications (user_id, title, body, link, category, read, created_at)
    VALUES
      (v_student_1, 'Welcome to LINGUA! 🎉', 'Your account is ready. Book your first demo session today.', '/student/demo-session', 'general', false, now() - interval '5 days');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications WHERE user_id = v_student_1 AND title = 'Session completed'
  ) THEN
    INSERT INTO public.notifications (user_id, title, body, link, category, read, created_at)
    VALUES
      (v_student_1, 'Session completed', 'Your French session with Camille was marked complete. Great job!', '/student/sessions', 'session', true, now() - interval '3 days');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications WHERE user_id = v_student_2 AND title = 'New homework assigned'
  ) THEN
    INSERT INTO public.notifications (user_id, title, body, link, category, read, created_at)
    VALUES
      (v_student_2, 'New homework assigned', 'Diego assigned you homework for the Spanish fundamentals session.', '/student/sessions', 'homework', false, now() - interval '1 day');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications WHERE user_id = v_mentor_fr AND title = 'New booking request'
  ) THEN
    INSERT INTO public.notifications (user_id, title, body, link, category, read, created_at)
    VALUES
      (v_mentor_fr, 'New booking request', 'A student requested a session with you.', '/mentor/calendar', 'booking', false, now() - interval '1 day');
  END IF;

  -- ============================================================
  -- DEMO REPORTS (existence check for idempotency)
  -- ============================================================
  IF to_regclass('public.reports') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.reports WHERE reporter_id = v_student_1 AND category = 'technical'
    ) THEN
      INSERT INTO public.reports (reporter_id, category, details, status, created_at)
      VALUES
        (v_student_1, 'technical', 'Video call dropped mid-session but we reconnected quickly.', 'resolved', now() - interval '2 days');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.reports WHERE reporter_id = v_student_3 AND category = 'scheduling'
    ) THEN
      INSERT INTO public.reports (reporter_id, category, details, status, created_at)
      VALUES
        (v_student_3, 'scheduling', 'Requested a reschedule for my session.', 'open', now() - interval '1 day');
    END IF;
  END IF;

  RAISE NOTICE 'Phase 5 demo seed data inserted successfully.';
END $$;
