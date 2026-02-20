-- Add user-facing suggestion when scrape fails (actionable tips)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS scraping_suggestion TEXT DEFAULT NULL;

COMMENT ON COLUMN jobs.scraping_suggestion IS 'Actionable suggestion shown when sourcing fails (e.g. try broader title or location)';
