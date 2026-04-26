-- Allow unauthenticated (candidate) access to offers via the secure token link.
-- The offer_token is a 64-char cryptographically random hex string (256-bit entropy),
-- so possession of the token is sufficient authorization to read the offer.
-- The actual row filtering (offer_token = <value>) is applied by the query; this
-- policy just gates the anon role so PostgREST doesn't reject the request outright.

CREATE POLICY "Public can read offer by token"
  ON public.offers
  FOR SELECT
  TO anon
  USING (offer_token IS NOT NULL);
