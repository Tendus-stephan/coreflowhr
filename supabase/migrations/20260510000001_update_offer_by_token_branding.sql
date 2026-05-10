-- Update get_offer_by_token to also return company_logo_url and banner_color
-- so the OfferResponse (candidate) page can display full client branding.

CREATE OR REPLACE FUNCTION public.get_offer_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer       RECORD;
  v_job         RECORD;
  v_cand        RECORD;
  v_ws          RECORD;
  v_client_logo TEXT;
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

  SELECT title, company, workspace_id INTO v_job
  FROM jobs WHERE id = v_offer.job_id;

  SELECT name INTO v_cand
  FROM candidates WHERE id = v_offer.candidate_id;

  -- Workspace branding (logo + banner color)
  SELECT name, company_logo_url, banner_color INTO v_ws
  FROM workspaces WHERE id = v_job.workspace_id;

  -- Prefer client logo when there is exactly one client with a logo
  SELECT logo_url INTO v_client_logo
  FROM clients
  WHERE workspace_id = v_job.workspace_id
    AND logo_url IS NOT NULL
  LIMIT 1;

  RETURN json_build_object(
    'offer',            row_to_json(v_offer),
    'job_title',        v_job.title,
    'company_name',     coalesce(v_ws.name, v_job.company),
    'candidate_name',   v_cand.name,
    'company_logo_url', coalesce(v_client_logo, v_ws.company_logo_url),
    'banner_color',     v_ws.banner_color
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_offer_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_offer_by_token(TEXT) TO authenticated;
