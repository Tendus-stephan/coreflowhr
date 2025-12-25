-- Make candidate_id nullable in offers table to support general offers
-- This allows creating offers without a candidate, which can be linked later

ALTER TABLE offers 
    ALTER COLUMN candidate_id DROP NOT NULL;

-- Update index to handle null values
DROP INDEX IF EXISTS idx_offers_candidate_id;
CREATE INDEX IF NOT EXISTS idx_offers_candidate_id ON offers(candidate_id) WHERE candidate_id IS NOT NULL;

-- Add index for general offers (those without candidates)
CREATE INDEX IF NOT EXISTS idx_offers_general ON offers(job_id, status) WHERE candidate_id IS NULL;




