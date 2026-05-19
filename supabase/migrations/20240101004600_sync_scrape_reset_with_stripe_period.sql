-- Sync scrape usage reset with Stripe subscription period
-- Uses subscription_current_period_end for reset date and period rollover when user has active subscription

CREATE OR REPLACE FUNCTION get_scrape_usage(p_user_id UUID)
RETURNS TABLE(used INTEGER, reset_date TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  v_period_end TIMESTAMP WITH TIME ZONE;
  v_status TEXT;
  v_used INTEGER;
  v_reset_date TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE := TIMEZONE('utc', NOW());
BEGIN
  -- Load subscription period and status
  SELECT us.subscription_current_period_end, us.subscription_status,
         COALESCE(us.scrapes_used_this_month, 0),
         COALESCE(us.scrapes_reset_date, v_now)
  INTO v_period_end, v_status, v_used, v_reset_date
  FROM public.user_settings us
  WHERE us.user_id = p_user_id;

  -- If user has active subscription and Stripe period end is set, use it for reset
  IF v_period_end IS NOT NULL
     AND (v_status IS NULL OR v_status IN ('active', 'trialing')) THEN

    -- Period has ended: reset usage for the new billing period
    IF v_now > v_period_end THEN
      UPDATE public.user_settings
      SET scrapes_used_this_month = 0,
          scrapes_reset_date = v_period_end
      WHERE user_id = p_user_id;
      v_used := 0;
      v_reset_date := v_period_end;
      -- Note: subscription_current_period_end will be updated to next period by Stripe webhook (subscription.updated)
      -- So we return the old period end here; next call will have new period end from webhook
    ELSE
      -- Within current period: return Stripe period end as reset date for display
      v_reset_date := v_period_end;
    END IF;

    RETURN QUERY SELECT v_used, v_reset_date;
    RETURN;
  END IF;

  -- No Stripe period: use 30-day rolling reset (free / no subscription)
  UPDATE public.user_settings
  SET scrapes_used_this_month = 0,
      scrapes_reset_date = v_now
  WHERE user_id = p_user_id
    AND scrapes_reset_date < v_now - INTERVAL '30 days';

  RETURN QUERY
  SELECT
    COALESCE(us.scrapes_used_this_month, 0),
    COALESCE(us.scrapes_reset_date, v_now)
  FROM public.user_settings us
  WHERE us.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
