-- SECURITY DEFINER RPC so unauthenticated candidates can mark an offer as viewed.
-- Only advances status from awaiting_response/sent → viewed (idempotent for all other statuses).

CREATE OR REPLACE FUNCTION public.mark_offer_viewed(p_token TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.offers
  SET
    status    = 'viewed',
    viewed_at = NOW()
  WHERE
    offer_token            = p_token
    AND status             IN ('awaiting_response', 'sent')
    AND (offer_token_expires_at IS NULL OR offer_token_expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anonymous callers to execute this function
GRANT EXECUTE ON FUNCTION public.mark_offer_viewed(TEXT) TO anon;
