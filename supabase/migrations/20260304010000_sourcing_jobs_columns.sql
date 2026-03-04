-- Migration 1: Sourcing fields on jobs table
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS sourcing_candidates_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sourcing_maxed_out BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sourcing_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sourcing_pdl_offset INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sourcing_last_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sourcing_error_message TEXT;
