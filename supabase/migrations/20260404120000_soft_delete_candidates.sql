-- Soft-delete support for candidates.
-- Adds deleted_at timestamp; NULL = active, non-NULL = trashed.
-- Hard deletes are replaced by setting this column in application code.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Partial index for fast trash queries
CREATE INDEX IF NOT EXISTS idx_candidates_deleted_at
  ON candidates(deleted_at)
  WHERE deleted_at IS NOT NULL;
