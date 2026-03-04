-- Migration 2: Sourcing fields on candidates table
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS ai_match_score INTEGER,
  ADD COLUMN IF NOT EXISTS ai_match_reason TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS current_company TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
  ADD COLUMN IF NOT EXISTS sourced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdl_id TEXT;
