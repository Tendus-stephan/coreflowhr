-- Tracks per-user daily scrape metrics for monitoring and alerting.

CREATE TABLE IF NOT EXISTS public.scrape_metrics (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  total_scrapes        INTEGER NOT NULL DEFAULT 0,
  failed_scrapes       INTEGER NOT NULL DEFAULT 0,
  empty_results        INTEGER NOT NULL DEFAULT 0,
  rate_limited_count   INTEGER NOT NULL DEFAULT 0,
  total_candidates     INTEGER NOT NULL DEFAULT 0,
  total_duration_ms    BIGINT  NOT NULL DEFAULT 0,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.scrape_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own metrics"
  ON public.scrape_metrics FOR SELECT
  USING (auth.uid() = user_id);

-- Upserts a scrape event into today's metric row for the user.
CREATE OR REPLACE FUNCTION public.upsert_scrape_metrics(
  p_user_id          UUID,
  p_failed           BOOLEAN DEFAULT FALSE,
  p_empty            BOOLEAN DEFAULT FALSE,
  p_rate_limited     BOOLEAN DEFAULT FALSE,
  p_candidates       INTEGER DEFAULT 0,
  p_duration_ms      BIGINT  DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.scrape_metrics
    (user_id, date, total_scrapes, failed_scrapes, empty_results, rate_limited_count, total_candidates, total_duration_ms, updated_at)
  VALUES
    (p_user_id, CURRENT_DATE,
     1,
     CASE WHEN p_failed       THEN 1 ELSE 0 END,
     CASE WHEN p_empty        THEN 1 ELSE 0 END,
     CASE WHEN p_rate_limited THEN 1 ELSE 0 END,
     p_candidates,
     p_duration_ms,
     NOW())
  ON CONFLICT (user_id, date) DO UPDATE
    SET total_scrapes      = scrape_metrics.total_scrapes + 1,
        failed_scrapes     = scrape_metrics.failed_scrapes     + CASE WHEN p_failed       THEN 1 ELSE 0 END,
        empty_results      = scrape_metrics.empty_results      + CASE WHEN p_empty        THEN 1 ELSE 0 END,
        rate_limited_count = scrape_metrics.rate_limited_count + CASE WHEN p_rate_limited THEN 1 ELSE 0 END,
        total_candidates   = scrape_metrics.total_candidates   + p_candidates,
        total_duration_ms  = scrape_metrics.total_duration_ms  + p_duration_ms,
        updated_at         = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Sample alert queries ──────────────────────────────────────────────────────
-- High failure rate today (> 50% of scrapes failed):
--   SELECT user_id, total_scrapes, failed_scrapes,
--          ROUND(failed_scrapes::numeric / NULLIF(total_scrapes, 0) * 100, 1) AS fail_pct
--   FROM public.scrape_metrics
--   WHERE date = CURRENT_DATE AND total_scrapes >= 3
--     AND failed_scrapes::numeric / NULLIF(total_scrapes, 0) > 0.5;
--
-- Rate-limited more than 3 times today:
--   SELECT user_id, rate_limited_count FROM public.scrape_metrics
--   WHERE date = CURRENT_DATE AND rate_limited_count > 3;
--
-- Slow scrapes (avg > 90 seconds):
--   SELECT user_id, total_scrapes,
--          ROUND(total_duration_ms::numeric / NULLIF(total_scrapes, 0) / 1000, 1) AS avg_sec
--   FROM public.scrape_metrics
--   WHERE date = CURRENT_DATE
--   ORDER BY avg_sec DESC LIMIT 20;
