
-- =============== ENUMS ===============
CREATE TYPE public.app_role AS ENUM ('student', 'mentor', 'admin');
CREATE TYPE public.session_status AS ENUM ('pending','accepted','rejected','completed','cancelled');

-- =============== updated_at helper ===============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============== USER ROLES ===============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY
    CASE role WHEN 'admin' THEN 1 WHEN 'mentor' THEN 2 WHEN 'student' THEN 3 END LIMIT 1;
$$;

-- =============== PROFILES ===============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  country text,
  native_language text,
  bio text,
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== MENTOR PROFILES ===============
CREATE TABLE public.mentor_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  headline text,
  bio text,
  languages_taught text[] NOT NULL DEFAULT '{}',
  certifications text[] NOT NULL DEFAULT '{}',
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  years_experience int NOT NULL DEFAULT 0,
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  total_reviews int NOT NULL DEFAULT 0,
  availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_profiles TO authenticated;
GRANT SELECT ON public.mentor_profiles TO anon;
GRANT ALL ON public.mentor_profiles TO service_role;
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentor profiles public" ON public.mentor_profiles FOR SELECT USING (true);
CREATE POLICY "Mentors manage own profile" ON public.mentor_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_mentor_profiles_updated BEFORE UPDATE ON public.mentor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== GIGS ===============
CREATE TABLE public.gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  language text NOT NULL,
  duration_mins int NOT NULL DEFAULT 30,
  price numeric(10,2) NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gigs TO authenticated;
GRANT SELECT ON public.gigs TO anon;
GRANT ALL ON public.gigs TO service_role;
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gigs public" ON public.gigs FOR SELECT USING (true);
CREATE POLICY "Mentors manage own gigs" ON public.gigs FOR ALL TO authenticated USING (auth.uid() = mentor_id) WITH CHECK (auth.uid() = mentor_id);
CREATE TRIGGER trg_gigs_updated BEFORE UPDATE ON public.gigs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== SESSIONS ===============
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id uuid REFERENCES public.gigs(id) ON DELETE SET NULL,
  scheduled_time timestamptz NOT NULL,
  duration_mins int NOT NULL DEFAULT 30,
  status public.session_status NOT NULL DEFAULT 'pending',
  video_call_link text,
  notes text,
  student_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Session participants read" ON public.sessions FOR SELECT TO authenticated USING (auth.uid() = student_id OR auth.uid() = mentor_id);
CREATE POLICY "Students create sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Participants update sessions" ON public.sessions FOR UPDATE TO authenticated USING (auth.uid() = student_id OR auth.uid() = mentor_id) WITH CHECK (auth.uid() = student_id OR auth.uid() = mentor_id);
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_sessions_student ON public.sessions(student_id);
CREATE INDEX idx_sessions_mentor ON public.sessions(mentor_id);

-- =============== RESOURCES ===============
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text NOT NULL,
  language text,
  is_public boolean NOT NULL DEFAULT true,
  shared_with uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT SELECT ON public.resources TO anon;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resources visibility" ON public.resources FOR SELECT USING (is_public OR auth.uid() = mentor_id OR auth.uid() = shared_with);
CREATE POLICY "Mentors manage own resources" ON public.resources FOR ALL TO authenticated USING (auth.uid() = mentor_id) WITH CHECK (auth.uid() = mentor_id);

-- =============== STREAK & POINTS ===============
CREATE TABLE public.streak_points (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_active_date date,
  total_points int NOT NULL DEFAULT 0,
  badges text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streak_points TO authenticated;
GRANT ALL ON public.streak_points TO service_role;
ALTER TABLE public.streak_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Streaks public read" ON public.streak_points FOR SELECT USING (true);
CREATE POLICY "Users update own streak" ON public.streak_points FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users insert own streak" ON public.streak_points FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_streak_updated BEFORE UPDATE ON public.streak_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============== REVIEWS ===============
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Students create own reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

-- Trigger to update mentor rating average
CREATE OR REPLACE FUNCTION public.refresh_mentor_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.mentor_profiles
  SET rating_avg = COALESCE((SELECT round(avg(rating)::numeric,2) FROM public.reviews WHERE mentor_id = NEW.mentor_id),0),
      total_reviews = (SELECT count(*) FROM public.reviews WHERE mentor_id = NEW.mentor_id)
  WHERE user_id = NEW.mentor_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_refresh_mentor_rating AFTER INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.refresh_mentor_rating();

-- =============== NOTIFICATIONS ===============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System/authenticated insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);

-- =============== SIGNUP TRIGGER ===============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.email, NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.streak_points (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Session completion → award points & update streak
CREATE OR REPLACE FUNCTION public.on_session_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE last_date date; cur int;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT last_active_date, current_streak INTO last_date, cur FROM public.streak_points WHERE user_id = NEW.student_id;
    IF last_date IS NULL OR last_date < CURRENT_DATE - 1 THEN cur := 1;
    ELSIF last_date = CURRENT_DATE - 1 THEN cur := cur + 1;
    END IF;
    UPDATE public.streak_points
      SET current_streak = cur,
          longest_streak = GREATEST(longest_streak, cur),
          last_active_date = CURRENT_DATE,
          total_points = total_points + 50
      WHERE user_id = NEW.student_id;
    INSERT INTO public.notifications(user_id,title,body,link) VALUES
      (NEW.student_id,'Session completed 🎉','You earned 50 points. Keep your streak going!','/student/streak'),
      (NEW.mentor_id,'Session marked complete','Great job! The session is now recorded.','/mentor/sessions');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_on_session_completed AFTER UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.on_session_completed();

-- Notify on new booking
CREATE OR REPLACE FUNCTION public.notify_new_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications(user_id,title,body,link) VALUES
    (NEW.mentor_id,'New booking request','A student requested a session with you.','/mentor/calendar'),
    (NEW.student_id,'Booking sent','Your session request was sent to the mentor.','/student/sessions');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_new_session AFTER INSERT ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.notify_new_session();
