-- Soft-archive flag for offers so they can be hidden instead of hard-deleted
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_offers_archived ON public.offers(archived);

