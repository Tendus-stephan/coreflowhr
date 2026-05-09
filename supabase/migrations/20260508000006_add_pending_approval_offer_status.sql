-- Add 'pending_approval' and 'archived' to the offers status check constraint.
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
    'awaiting_response', 'pending_approval', 'archived'
  )
);
