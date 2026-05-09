-- Update get_offer_approval_by_token to also return workspace banner_color
create or replace function get_offer_approval_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req          record;
  v_offer        record;
  v_candidate    record;
  v_job          record;
  v_logo         text;
  v_client_logo  text;
  v_banner_color text;
begin
  select * into v_req
  from offer_approval_requests
  where approval_token = p_token;

  if not found then
    return null;
  end if;

  select * into v_offer
  from offers
  where id = v_req.offer_id;

  if v_offer.candidate_id is not null then
    select name, email into v_candidate
    from candidates
    where id = v_offer.candidate_id;
  end if;

  -- Use select * so client_id is accessible
  select * into v_job
  from jobs
  where id = v_offer.job_id;

  -- Workspace logo (fallback) + banner_color
  select company_logo_url, banner_color into v_logo, v_banner_color
  from workspaces
  where id = v_req.workspace_id;

  -- Client logo takes priority when available
  if v_job.client_id is not null then
    select logo_url into v_client_logo
    from clients
    where id = v_job.client_id;
  end if;

  return json_build_object(
    'request', json_build_object(
      'id',                        v_req.id,
      'offer_id',                  v_req.offer_id,
      'workspace_id',              v_req.workspace_id,
      'approver_user_id',          v_req.approver_user_id,
      'approval_token',            v_req.approval_token,
      'approval_token_expires_at', v_req.approval_token_expires_at,
      'status',                    v_req.status,
      'note',                      v_req.note,
      'responded_at',              v_req.responded_at,
      'created_at',                v_req.created_at
    ),
    'offer', json_build_object(
      'id',              v_offer.id,
      'position_title',  v_offer.position_title,
      'start_date',      v_offer.start_date,
      'salary_amount',   v_offer.salary_amount,
      'salary_currency', v_offer.salary_currency,
      'salary_period',   v_offer.salary_period,
      'benefits',        v_offer.benefits,
      'notes',           v_offer.notes,
      'status',          v_offer.status,
      'approval_status', v_offer.approval_status,
      'expires_at',      v_offer.expires_at
    ),
    'candidate_name',   coalesce(v_candidate.name, null),
    'job_title',        coalesce(v_job.title, null),
    'company_name',     coalesce(v_job.company, null),
    'company_logo_url', coalesce(v_client_logo, v_logo),
    'banner_color',     v_banner_color
  );
end;
$$;
