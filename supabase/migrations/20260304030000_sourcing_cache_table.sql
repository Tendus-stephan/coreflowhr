-- Migration 3: Sourcing cache table
CREATE TABLE IF NOT EXISTS sourcing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linkedin_url TEXT UNIQUE,
  pdl_id TEXT UNIQUE,
  full_name TEXT,
  current_job_title TEXT,
  current_company TEXT,
  location TEXT,
  profile_picture_url TEXT,
  email TEXT,
  skills JSONB DEFAULT '[]',
  experience JSONB DEFAULT '[]',
  education JSONB DEFAULT '[]',
  raw_pdl_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sourcing_cache_linkedin_url_idx ON sourcing_cache(linkedin_url);
CREATE INDEX IF NOT EXISTS sourcing_cache_pdl_id_idx ON sourcing_cache(pdl_id);

-- RLS: internal use only via service role
ALTER TABLE sourcing_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON sourcing_cache USING (FALSE);
