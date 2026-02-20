-- Limit concurrent scrapes so we don't exceed HarvestAPI concurrency (e.g. 1–10 per account).
-- Multiple users scraping at once are queued: only MAX_CONCURRENT_SCRAPES run at a time.

CREATE TABLE IF NOT EXISTS scrape_active (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scrape_active_started ON scrape_active(started_at);

COMMENT ON TABLE scrape_active IS 'Tracks in-flight scrapes for concurrency limit. Rows are removed when scrape finishes or after 10 min (stale).';

-- Acquire a slot. Returns slot id (uuid) or null if at limit. Call release by deleting that id.
-- MAX 3 concurrent scrapes (tune to match your HarvestAPI plan: 1=free, 5=Starter, 10=Basic, 20=Pro).
CREATE OR REPLACE FUNCTION acquire_scrape_slot()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  slot_id uuid;
  max_slots int := 3;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('scrape_slots'));
  -- Remove stale slots (scrape crashed or timed out)
  DELETE FROM scrape_active WHERE started_at < now() - interval '10 minutes';
  IF (SELECT count(*) FROM scrape_active) < max_slots THEN
    INSERT INTO scrape_active (id, started_at) VALUES (gen_random_uuid(), now()) RETURNING id INTO slot_id;
    RETURN slot_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Release is just: DELETE FROM scrape_active WHERE id = $1;
