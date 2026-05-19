-- Add offer response token columns to offers table
-- This allows candidates to accept/decline offers via a secure link

ALTER TABLE offers
ADD COLUMN IF NOT EXISTS offer_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS offer_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_offers_offer_token ON offers(offer_token)
WHERE offer_token IS NOT NULL;




