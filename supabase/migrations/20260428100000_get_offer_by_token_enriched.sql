-- Public RPC for the candidate OfferResponse page.
-- Returns offer row + enriched job title, company name, and candidate name
-- without requiring the caller to be authenticated. SECURITY DEFINER bypasses
-- RLS on offers, jobs, and candidates so anon users can read their offer.

CREATE OR REPLACE FUNCTION public.get_offer_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer   RECORD;
  v_job     RECORD;
  v_cand    RECORD;
BEGIN
  SELECT * INTO v_offer
  FROM offers
  WHERE offer_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_offer.offer_token_expires_at IS NOT NULL
     AND v_offer.offer_token_expires_at < NOW() THEN
    RETURN json_build_object('error', 'expired');
  END IF;

  SELECT title, company INTO v_job
  FROM jobs WHERE id = v_offer.job_id;

  SELECT name INTO v_cand
  FROM candidates WHERE id = v_offer.candidate_id;

  RETURN json_build_object(
    'offer',          row_to_json(v_offer),
    'job_title',      v_job.title,
    'company_name',   v_job.company,
    'candidate_name', v_cand.name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_offer_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_offer_by_token(TEXT) TO authenticated;
