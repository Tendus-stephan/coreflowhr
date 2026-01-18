-- Add registration token columns for candidate email collection via outreach
-- This allows scraped candidates (no email) to register their email through outreach links

ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS registration_token TEXT,
ADD COLUMN IF NOT EXISTS registration_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS registration_token_used BOOLEAN DEFAULT false;

-- Index for fast token lookups during registration
CREATE INDEX IF NOT EXISTS idx_candidates_registration_token 
ON candidates(registration_token) 
WHERE registration_token IS NOT NULL;
