-- Extend jobs table with richer scraping tracking fields
-- These fields support async scraping, retries, and progress reporting.

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS scrape_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS scrape_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS candidates_found INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.jobs.scrape_started_at IS 'When scraping actually started for this job.';
COMMENT ON COLUMN public.jobs.scrape_completed_at IS 'When scraping finished (success or failure).';
COMMENT ON COLUMN public.jobs.candidates_found IS 'Number of candidates saved during the latest scraping run.';
COMMENT ON COLUMN public.jobs.retry_count IS 'How many times scraping has been retried after an error or empty result.';
COMMENT ON COLUMN public.jobs.last_retry_at IS 'Timestamp of the last automatic retry attempt.';

