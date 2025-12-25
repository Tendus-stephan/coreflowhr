-- Migration: Add CV upload and source tracking fields to candidates table
-- Run this in Supabase SQL Editor

-- Add CV file storage reference and source tracking
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS cv_file_url TEXT,
ADD COLUMN IF NOT EXISTS cv_file_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS cover_letter TEXT,
ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('ai_sourced', 'direct_application', 'email_application', 'referral')) DEFAULT 'ai_sourced',
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Update existing AI-sourced candidates to be marked as test
UPDATE candidates 
SET source = 'ai_sourced', is_test = true 
WHERE ai_analysis LIKE '%TEST CANDIDATE%' OR ai_analysis LIKE '%(TEST CANDIDATE)%';

-- Add unique constraint: one email per job (prevents duplicate applications)
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_job_email_unique 
ON candidates(job_id, LOWER(TRIM(email)));

-- Create storage bucket for CVs (run in Supabase Storage or SQL)
-- Note: This requires storage admin permissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-cvs',
  'candidate-cvs',
  false,  -- Private bucket
  5242880,  -- 5MB file size limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']  -- PDF, DOC, DOCX
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Allow public to upload CVs (for job applications)
DROP POLICY IF EXISTS "Public can upload CVs" ON storage.objects;
CREATE POLICY "Public can upload CVs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'candidate-cvs'
);

-- Storage policy: Allow authenticated users (recruiters) to read CVs
DROP POLICY IF EXISTS "Recruiters can read CVs" ON storage.objects;
CREATE POLICY "Recruiters can read CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'candidate-cvs');

-- Storage policy: Allow system to manage CV files
DROP POLICY IF EXISTS "System can manage CVs" ON storage.objects;
CREATE POLICY "System can manage CVs"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'candidate-cvs')
WITH CHECK (bucket_id = 'candidate-cvs');

-- Allow public to view active jobs (for application page)
DROP POLICY IF EXISTS "Public can view active jobs" ON jobs;
CREATE POLICY "Public can view active jobs"
ON jobs FOR SELECT
TO public
USING (status = 'Active');



-- Add CV file storage reference and source tracking
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS cv_file_url TEXT,
ADD COLUMN IF NOT EXISTS cv_file_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS cover_letter TEXT,
ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('ai_sourced', 'direct_application', 'email_application', 'referral')) DEFAULT 'ai_sourced',
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Update existing AI-sourced candidates to be marked as test
UPDATE candidates 
SET source = 'ai_sourced', is_test = true 
WHERE ai_analysis LIKE '%TEST CANDIDATE%' OR ai_analysis LIKE '%(TEST CANDIDATE)%';

-- Add unique constraint: one email per job (prevents duplicate applications)
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_job_email_unique 
ON candidates(job_id, LOWER(TRIM(email)));

-- Create storage bucket for CVs (run in Supabase Storage or SQL)
-- Note: This requires storage admin permissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-cvs',
  'candidate-cvs',
  false,  -- Private bucket
  5242880,  -- 5MB file size limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']  -- PDF, DOC, DOCX
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Allow public to upload CVs (for job applications)
DROP POLICY IF EXISTS "Public can upload CVs" ON storage.objects;
CREATE POLICY "Public can upload CVs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'candidate-cvs'
);

-- Storage policy: Allow authenticated users (recruiters) to read CVs
DROP POLICY IF EXISTS "Recruiters can read CVs" ON storage.objects;
CREATE POLICY "Recruiters can read CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'candidate-cvs');

-- Storage policy: Allow system to manage CV files
DROP POLICY IF EXISTS "System can manage CVs" ON storage.objects;
CREATE POLICY "System can manage CVs"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'candidate-cvs')
WITH CHECK (bucket_id = 'candidate-cvs');

-- Allow public to view active jobs (for application page)
DROP POLICY IF EXISTS "Public can view active jobs" ON jobs;
CREATE POLICY "Public can view active jobs"
ON jobs FOR SELECT
TO public
USING (status = 'Active');







