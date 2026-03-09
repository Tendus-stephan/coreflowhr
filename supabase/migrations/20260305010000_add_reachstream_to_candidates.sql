-- Migration: Add ReachStream fields to candidates table
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS reachstream_id TEXT;

CREATE INDEX IF NOT EXISTS candidates_reachstream_id_idx
  ON candidates(reachstream_id);
