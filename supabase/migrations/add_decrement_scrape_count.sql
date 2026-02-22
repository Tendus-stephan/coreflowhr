-- Adds decrement_scrape_count RPC so we can refund scrape credits
-- on provider/infra failures (rate limits, timeouts, auth errors).

CREATE OR REPLACE FUNCTION public.decrement_scrape_count(
  p_user_id UUID,
  p_by      INTEGER DEFAULT 1
)
RETURNS void AS $$
BEGIN
  UPDATE public.user_settings
  SET scrapes_used_this_month = GREATEST(0, COALESCE(scrapes_used_this_month, 0) - p_by)
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
