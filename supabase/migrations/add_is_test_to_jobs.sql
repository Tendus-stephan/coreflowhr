-- Add is_test column to jobs table for test mode support
-- This allows jobs to be marked as test data

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Add index for filtering test jobs
CREATE INDEX IF NOT EXISTS idx_jobs_is_test ON jobs(is_test);

-- Add comment for documentation
COMMENT ON COLUMN jobs.is_test IS 'Marks jobs as test data when test mode is enabled';




