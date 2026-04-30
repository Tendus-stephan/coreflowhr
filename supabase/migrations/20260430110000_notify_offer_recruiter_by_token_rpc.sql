-- SECURITY DEFINER function so an unauthenticated candidate (anon role) can
-- create a notification for the recruiter when they respond to an offer via token.
-- The offer_token acts as the authorization gate — the function refuses to insert
-- unless the token matches a real offer row.

CREATE OR REPLACE FUNCTION notify_offer_recruiter_by_token(
  p_offer_token TEXT,
  p_type        TEXT,
  p_title       TEXT,
  p_desc        TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID;
  v_category TEXT;
BEGIN
  -- Resolve the recruiter's user_id from the token (security gate)
  SELECT user_id INTO v_user_id
  FROM offers
  WHERE offer_token = p_offer_token
    AND offer_token IS NOT NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid offer token';
  END IF;

  -- Resolve category
  v_category := CASE p_type
    WHEN 'offer_accepted'         THEN 'job'
    WHEN 'offer_declined'         THEN 'job'
    WHEN 'counter_offer_received' THEN 'job'
    ELSE 'system'
  END;

  INSERT INTO notifications (user_id, title, "desc", type, category, unread)
  VALUES (v_user_id, p_title, p_desc, p_type, v_category, true);
END;
$$;

-- Grant to anon so unauthenticated offer-response pages can call it.
-- The function itself validates the token before inserting — anon cannot
-- spoof notifications for arbitrary recruiters.
GRANT EXECUTE ON FUNCTION notify_offer_recruiter_by_token(TEXT, TEXT, TEXT, TEXT) TO anon;
