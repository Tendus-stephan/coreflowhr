-- Add 'awaiting_response' to the offers status check constraint.
-- This is used in the two-phase offer flow:
--   awaiting_response → candidate reviews offer page (Accept/Decline/Counter)
--   accepted → candidate clicked Accept → triggers Dropbox Sign
--   awaiting_signature → Dropbox Sign request sent
--   signed → candidate has signed

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
  status IN (
    'draft', 'sent', 'viewed', 'negotiating',
    'accepted', 'declined', 'expired',
    'awaiting_signature', 'signed',
    'awaiting_response'
  )
);
