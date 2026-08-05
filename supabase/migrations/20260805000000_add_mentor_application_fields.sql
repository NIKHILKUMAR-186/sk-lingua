-- Extend mentor applications with full application details and duplicate prevention
ALTER TABLE public.mentor_applications
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS degree text,
ADD COLUMN IF NOT EXISTS college text,
ADD COLUMN IF NOT EXISTS graduation_year integer,
ADD COLUMN IF NOT EXISTS current_company text,
ADD COLUMN IF NOT EXISTS "current_role" text,
ADD COLUMN IF NOT EXISTS subjects text[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS availability text[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS github_url text,
ADD COLUMN IF NOT EXISTS portfolio_url text,
ADD COLUMN IF NOT EXISTS resume_path text,
ADD COLUMN IF NOT EXISTS resume_url text,
ADD COLUMN IF NOT EXISTS resume_file_name text,
ADD COLUMN IF NOT EXISTS resume_file_type text,
ADD COLUMN IF NOT EXISTS why_apply text,
ADD COLUMN IF NOT EXISTS why_good_mentor text,
ADD COLUMN IF NOT EXISTS teaching_methodology text;

CREATE UNIQUE INDEX IF NOT EXISTS mentor_applications_email_unique_idx
ON public.mentor_applications (LOWER(email));
