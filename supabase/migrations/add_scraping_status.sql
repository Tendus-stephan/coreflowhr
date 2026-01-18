-- Add scraping status fields to jobs table for retry functionality
-- These fields track scraping attempts and allow users to retry sourcing

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS scraping_status TEXT CHECK (scraping_status IN ('pending', 'succeeded', 'failed')) DEFAULT NULL;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS scraping_error TEXT DEFAULT NULL;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS scraping_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for faster queries on scraping status
CREATE INDEX IF NOT EXISTS idx_jobs_scraping_status ON jobs(scraping_status) WHERE scraping_status IS NOT NULL;

-- Update existing active jobs to have 'pending' status
UPDATE jobs 
SET scraping_status = 'pending' 
WHERE status = 'Active' AND scraping_status IS NULL;

