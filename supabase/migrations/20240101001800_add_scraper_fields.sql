-- Add fields for scraper: profile_url, portfolio_urls, work_experience, education
-- Make email nullable since we're scraping LinkedIn (no emails)

-- Add profile_url column
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS profile_url TEXT;

-- Add portfolio_urls column (JSONB to store {linkedin, github, website, twitter})
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS portfolio_urls JSONB;

-- Add work_experience column (JSONB array)
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS work_experience JSONB;

-- Add education column (JSONB array)
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS education JSONB;

-- Make email nullable (scraped candidates don't have emails)
ALTER TABLE candidates 
ALTER COLUMN email DROP NOT NULL;

-- Add index on profile_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_candidates_profile_url ON candidates(profile_url) WHERE profile_url IS NOT NULL;

