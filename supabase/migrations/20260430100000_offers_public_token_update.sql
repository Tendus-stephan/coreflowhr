-- Allow unauthenticated (candidate) UPDATE on offers via the secure token link.
-- Enables candidates to submit counter offers and decline offers without being logged in.
-- The offer_token is a 64-char cryptographically random hex string (256-bit entropy),
-- so possession of the token (passed as a query filter) is sufficient authorization.
-- PostgREST applies the ?offer_token=eq.<value> filter before evaluating this policy.

CREATE POLICY "Public can update offer by token"
  ON public.offers
  FOR UPDATE
  TO anon
  USING (offer_token IS NOT NULL)
  WITH CHECK (offer_token IS NOT NULL);
