-- ============================================
-- MIGRATION: Add scraping status fields
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- This adds tracking fields for candidate sourcing/scraping status

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS scraping_status TEXT CHECK (scraping_status IN ('pending', 'succeeded', 'failed')) DEFAULT NULL;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS scraping_error TEXT DEFAULT NULL;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS scraping_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for faster queries on scraping status
CREATE INDEX IF NOT EXISTS idx_jobs_scraping_status ON jobs(scraping_status) WHERE scraping_status IS NOT NULL;

-- Verify columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name IN ('scraping_status', 'scraping_error', 'scraping_attempted_at')
ORDER BY column_name;
