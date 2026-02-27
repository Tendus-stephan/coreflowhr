-- eSignature on offers: new columns and status values for Dropbox Sign flow

-- Add columns
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS require_esignature BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS esignature_request_id TEXT,
  ADD COLUMN IF NOT EXISTS signed_pdf_path TEXT;

-- Extend status to allow awaiting_signature and signed (drop existing check, add new)
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'offers' AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS %I', cname);
  END LOOP;
END $$;
ALTER TABLE public.offers ADD CONSTRAINT offers_status_check CHECK (
  status IN ('draft', 'sent', 'viewed', 'negotiating', 'accepted', 'declined', 'expired', 'awaiting_signature', 'signed')
);

CREATE INDEX IF NOT EXISTS idx_offers_esignature_request_id ON public.offers(esignature_request_id)
  WHERE esignature_request_id IS NOT NULL;
