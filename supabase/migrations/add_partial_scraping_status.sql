-- Add 'partial' status to scraping_status enum
-- This allows tracking jobs where some candidates were saved before a network error

ALTER TABLE jobs 
DROP CONSTRAINT IF EXISTS jobs_scraping_status_check;

ALTER TABLE jobs 
ADD CONSTRAINT jobs_scraping_status_check 
CHECK (scraping_status IN ('pending', 'succeeded', 'failed', 'partial'));
