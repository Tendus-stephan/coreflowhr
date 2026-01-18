-- Allow public/anonymous access to candidates table for CV upload via token
-- This allows candidates without accounts to upload CVs via token links

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read candidate by cv upload token" ON candidates;
DROP POLICY IF EXISTS "Public can insert candidate for CV upload" ON candidates;
DROP POLICY IF EXISTS "Public can update candidate CV via upload token" ON candidates;

-- Create policy: Allow anonymous users to read candidate data if they have a CV upload token OR checking by email
CREATE POLICY "Public can read candidate by cv upload token"
ON candidates FOR SELECT
TO public
USING (
  -- Allow read if candidate has a CV upload token OR checking by email (for duplicate check during application)
  cv_upload_token IS NOT NULL
  OR email IS NOT NULL  -- Allow checking for duplicate applications by email
);

-- Allow public to insert new candidates for CV upload (direct applications)
CREATE POLICY "Public can insert candidate for CV upload"
ON candidates FOR INSERT
TO public
WITH CHECK (
  -- Allow insert for direct applications (no token required - anyone can apply)
  source = 'direct_application'
  OR cv_upload_token IS NOT NULL
);

-- Allow public to update candidate CV and related data via CV upload token
CREATE POLICY "Public can update candidate CV via upload token"
ON candidates FOR UPDATE
TO public
USING (
  -- Allow update if cv_upload_token exists (for token-based updates)
  -- OR if candidate is being updated as part of direct application flow
  cv_upload_token IS NOT NULL
  OR source = 'direct_application'
)
WITH CHECK (
  -- Can update CV file, skills, experience, etc. during upload
  cv_upload_token IS NOT NULL
  OR source = 'direct_application'
);
