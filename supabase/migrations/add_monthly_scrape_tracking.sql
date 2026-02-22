-- Track monthly scrape usage per user
-- Counts scrapes used in current billing cycle and resets on renewal

ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS scrapes_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS scrapes_reset_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_settings_scrapes_reset ON public.user_settings(scrapes_reset_date);

-- Function to increment scrape count (called after each successful scrape)
CREATE OR REPLACE FUNCTION increment_scrape_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  UPDATE public.user_settings
  SET scrapes_used_this_month = COALESCE(scrapes_used_this_month, 0) + 1
  WHERE user_id = p_user_id
  RETURNING scrapes_used_this_month INTO current_count;

  RETURN COALESCE(current_count, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current scrape usage (auto-resets if past billing cycle)
CREATE OR REPLACE FUNCTION get_scrape_usage(p_user_id UUID)
RETURNS TABLE(used INTEGER, reset_date TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  -- Auto-reset if the reset date is more than 30 days ago
  UPDATE public.user_settings
  SET scrapes_used_this_month = 0,
      scrapes_reset_date = TIMEZONE('utc', NOW())
  WHERE user_id = p_user_id
    AND scrapes_reset_date < TIMEZONE('utc', NOW()) - INTERVAL '30 days';

  RETURN QUERY
  SELECT
    COALESCE(us.scrapes_used_this_month, 0),
    COALESCE(us.scrapes_reset_date, TIMEZONE('utc', NOW()))
  FROM public.user_settings us
  WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
