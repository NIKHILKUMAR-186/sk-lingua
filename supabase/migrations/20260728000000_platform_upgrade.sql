-- ============================================================
-- Phase 3: Platform Upgrade
-- Adds columns to existing tables (no destructive changes)
-- ============================================================

-- 1. Enhanced Gig Columns
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS cover_image text;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS whats_included jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS learning_outcomes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS prerequisites text;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS homework_included boolean DEFAULT false;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS recording_included boolean DEFAULT false;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS certificate_included boolean DEFAULT false;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- 2. Enhanced Mentor Profile Columns
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS about text;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS experience jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS portfolio_images jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS intro_video_url text;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS demo_lesson_url text;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS verification_badges jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS total_students integer DEFAULT 0;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS total_sessions integer DEFAULT 0;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS response_rate numeric DEFAULT 100;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS completion_rate numeric DEFAULT 100;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS joined_date timestamptz DEFAULT now();
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS specializations jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS achievements jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.mentor_profiles ADD COLUMN IF NOT EXISTS gallery_images jsonb DEFAULT '[]'::jsonb;

-- 3. Enhanced Reviews Columns (multi-category ratings)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS clarity_rating integer;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS engagement_rating integer;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS expertise_rating integer;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS punctuality_rating integer;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT true;

-- 4. Resource Category
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS is_bookmarked boolean DEFAULT false;

-- 5. Notification Category
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS kind text DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS gigs_mentor_active_idx ON public.gigs (mentor_id, is_active);
CREATE INDEX IF NOT EXISTS gigs_featured_idx ON public.gigs (mentor_id, featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS reviews_mentor_rating_idx ON public.reviews (mentor_id, rating);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS notifications_category_idx ON public.notifications (user_id, category);
CREATE INDEX IF NOT EXISTS resources_category_idx ON public.resources (category);
CREATE INDEX IF NOT EXISTS resources_bookmarked_idx ON public.resources (is_bookmarked) WHERE is_bookmarked = true;

