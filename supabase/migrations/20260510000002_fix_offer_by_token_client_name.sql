-- Fix get_offer_by_token to:
--   • Resolve company_name from the job's linked client (if any), falling back to jobs.company
--   • Resolve company_logo_url from the job's linked client (if any), falling back to workspace logo
-- This aligns with the get_offer_approval_by_token RPC behaviour.

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
  v_client_name TEXT;
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

  -- Use SELECT * so client_id is accessible (mirrors approval RPC)
  SELECT * INTO v_job
  FROM jobs WHERE id = v_offer.job_id;

  SELECT name INTO v_cand
  FROM candidates WHERE id = v_offer.candidate_id;

  -- Workspace logo + banner_color (fallback)
  SELECT company_logo_url, banner_color INTO v_ws
  FROM workspaces WHERE id = v_job.workspace_id;

  -- Client name + logo take priority when the job is linked to a client
  IF v_job.client_id IS NOT NULL THEN
    SELECT name, logo_url INTO v_client_name, v_client_logo
    FROM clients
    WHERE id = v_job.client_id;
  END IF;

  RETURN json_build_object(
    'offer',            row_to_json(v_offer),
    'job_title',        v_job.title,
    'company_name',     coalesce(v_client_name, v_job.company),
    'candidate_name',   v_cand.name,
    'company_logo_url', coalesce(v_client_logo, v_ws.company_logo_url),
    'banner_color',     v_ws.banner_color
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_offer_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_offer_by_token(TEXT) TO authenticated;
