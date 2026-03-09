-- Migration: Add ReachStream fields to sourcing_cache table
ALTER TABLE sourcing_cache
  ADD COLUMN IF NOT EXISTS reachstream_id TEXT;

CREATE INDEX IF NOT EXISTS sourcing_cache_reachstream_id_idx
  ON sourcing_cache(reachstream_id);
