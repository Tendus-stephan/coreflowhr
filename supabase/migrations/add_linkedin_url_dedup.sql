-- Add linkedin_url for deduplication and cross-job flagging
-- Normalized URL: one candidate per LinkedIn profile per job

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

COMMENT ON COLUMN candidates.linkedin_url IS 'Normalized LinkedIn profile URL for dedup within job and cross-job "Also in Job X"';

-- Unique per job: same LinkedIn URL cannot appear twice in one job
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_job_linkedin_unique
ON candidates(job_id, linkedin_url)
WHERE linkedin_url IS NOT NULL AND linkedin_url != '';

-- Index for cross-job lookups (same user's other jobs)
CREATE INDEX IF NOT EXISTS idx_candidates_linkedin_url
ON candidates(linkedin_url)
WHERE linkedin_url IS NOT NULL AND linkedin_url != '';

-- Backfill from portfolio_urls->>'linkedin' or profile_url when it looks like LinkedIn
UPDATE candidates
SET linkedin_url = LOWER(TRIM(
  COALESCE(
    portfolio_urls->>'linkedin',
    CASE WHEN profile_url IS NOT NULL AND (profile_url ILIKE '%linkedin.com%') THEN profile_url ELSE NULL END
  )
))
WHERE linkedin_url IS NULL
  AND (
    (portfolio_urls IS NOT NULL AND portfolio_urls->>'linkedin' IS NOT NULL AND portfolio_urls->>'linkedin' != '')
    OR (profile_url IS NOT NULL AND profile_url ILIKE '%linkedin.com%')
  );

-- Normalize backfilled: strip trailing slash, lowercase
UPDATE candidates
SET linkedin_url = RTRIM(LOWER(TRIM(linkedin_url)), '/')
WHERE linkedin_url IS NOT NULL AND linkedin_url != '';
