-- Review & Rating System Upgrade
-- Adds detailed rating categories, RLS policies, and mentor stats auto-update
BEGIN;

-- Step 1: Add new columns to reviews table
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS teaching_quality_rating int2,
  ADD COLUMN IF NOT EXISTS communication_rating int2,
  ADD COLUMN IF NOT EXISTS knowledge_rating int2,
  ADD COLUMN IF NOT EXISTS friendliness_rating int2,
  ADD COLUMN IF NOT EXISTS recommend boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS review_text text,
  ADD COLUMN IF NOT EXISTS attachment_url text;

-- Add check constraints for rating fields (1-5)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_overall_rating_check'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_overall_rating_check CHECK (rating >= 1 AND rating <= 5);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_teaching_quality_rating_check'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_teaching_quality_rating_check CHECK (teaching_quality_rating >= 1 AND teaching_quality_rating <= 5);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_communication_rating_check'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_communication_rating_check CHECK (communication_rating >= 1 AND communication_rating <= 5);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_knowledge_rating_check'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_knowledge_rating_check CHECK (knowledge_rating >= 1 AND knowledge_rating <= 5);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_punctuality_rating_check'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_punctuality_rating_check CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_friendliness_rating_check'
  ) THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_friendliness_rating_check CHECK (friendliness_rating >= 1 AND friendliness_rating <= 5);
  END IF;
END $$;

-- Step 2: Add review_text column (ensure it exists as replacement for comment)
ALTER TABLE public.reviews ALTER COLUMN review_text TYPE text USING COALESCE(review_text, comment);

-- Step 3: Enable RLS (already enabled, but ensure)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies to re-create
DROP POLICY IF EXISTS "Students can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviews are publicly readable" ON public.reviews;
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
DROP POLICY IF EXISTS "No updates after 24 hours" ON public.reviews;
DROP POLICY IF EXISTS "One review per session" ON public.reviews;

-- Policy: Only the student who attended the completed session can INSERT
CREATE POLICY "Students can insert reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = reviews.session_id
        AND s.student_id = auth.uid()
        AND s.status = 'completed'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.session_id = reviews.session_id
        AND r.student_id = auth.uid()
    )
  );

-- Policy: Everyone can read public reviews (for mentor profiles, etc.)
CREATE POLICY "Reviews are publicly readable" ON public.reviews
  FOR SELECT TO authenticated, anon
  USING (true);

-- Policy: Only admins can DELETE
CREATE POLICY "Admins can delete reviews" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Policy: No UPDATE after 24 hours (only within 24h window)
CREATE POLICY "No updates after 24 hours" ON public.reviews
  FOR UPDATE TO authenticated
  USING (
    student_id = auth.uid()
    AND created_at > now() - interval '24 hours'
  )
  WITH CHECK (
    student_id = auth.uid()
    AND created_at > now() - interval '24 hours'
  );

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;

-- Step 6: Create or replace function to auto-update mentor_profiles stats
CREATE OR REPLACE FUNCTION public.update_mentor_review_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mentor_id uuid;
BEGIN
  -- Determine mentor_id from the review being modified
  IF TG_OP = 'DELETE' THEN
    v_mentor_id := OLD.mentor_id;
  ELSE
    v_mentor_id := NEW.mentor_id;
  END IF;

  -- Update mentor_profiles with aggregated stats
  UPDATE public.mentor_profiles
  SET
    rating_avg = COALESCE(
      (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.reviews WHERE mentor_id = v_mentor_id),
      0
    ),
    total_reviews = (SELECT COUNT(*) FROM public.reviews WHERE mentor_id = v_mentor_id)
  WHERE user_id = v_mentor_id;

  RETURN NULL;
END;
$$;

-- Step 7: Create triggers for review insert, update, delete
DROP TRIGGER IF EXISTS trg_reviews_update_mentor_stats ON public.reviews;
CREATE TRIGGER trg_reviews_update_mentor_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mentor_review_stats();

-- Step 8: Create storage bucket for review attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-attachments', 'review-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to review-attachments
CREATE POLICY "Anyone can upload review attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-attachments');

CREATE POLICY "Anyone can view review attachments" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket_id = 'review-attachments');

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_mentor_id ON public.reviews(mentor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON public.reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_reviews_student_id ON public.reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

COMMIT;

