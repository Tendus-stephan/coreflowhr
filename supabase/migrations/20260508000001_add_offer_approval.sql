-- Add approval columns to offers table
alter table offers
  add column if not exists requires_approval boolean default false,
  add column if not exists approval_status text check (approval_status in ('pending', 'approved', 'rejected')),
  add column if not exists approval_note text;

-- New approval requests table (one row per approver per offer)
create table if not exists offer_approval_requests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references offers(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) not null,
  approver_user_id uuid references profiles(id) not null,
  approval_token text unique not null,
  approval_token_expires_at timestamptz not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text,
  responded_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table offer_approval_requests enable row level security;

create policy "approver can read own requests"
  on offer_approval_requests for select
  using (approver_user_id = auth.uid());

create policy "workspace members can read approval requests"
  on offer_approval_requests for select
  using (workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  ));

-- SECURITY DEFINER RPC: look up an approval request + offer details by token (no auth required)
create or replace function get_offer_approval_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req record;
  v_offer record;
  v_candidate record;
  v_job record;
  v_logo text;
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

  select title, company into v_job
  from jobs
  where id = v_offer.job_id;

  select company_logo_url into v_logo
  from workspaces
  where id = v_req.workspace_id;

  return json_build_object(
    'request', json_build_object(
      'id',                    v_req.id,
      'offer_id',              v_req.offer_id,
      'workspace_id',          v_req.workspace_id,
      'approver_user_id',      v_req.approver_user_id,
      'approval_token',        v_req.approval_token,
      'approval_token_expires_at', v_req.approval_token_expires_at,
      'status',                v_req.status,
      'note',                  v_req.note,
      'responded_at',          v_req.responded_at,
      'created_at',            v_req.created_at
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
    'candidate_name',    coalesce(v_candidate.name, null),
    'job_title',         coalesce(v_job.title, null),
    'company_name',      coalesce(v_job.company, null),
    'company_logo_url',  v_logo
  );
end;
$$;

-- SECURITY DEFINER RPC: respond to an approval request by token
-- Updates the approval row, checks if all resolved, updates offer accordingly
-- Does NOT auto-send the offer (that is triggered from api.ts after RPC returns)
create or replace function respond_to_offer_approval(
  p_token    text,
  p_decision text,
  p_note     text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req         record;
  v_pending_count int;
  v_rejected_count int;
  v_offer       record;
begin
  -- Validate decision
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision: %', p_decision;
  end if;

  -- Fetch request
  select * into v_req
  from offer_approval_requests
  where approval_token = p_token;

  if not found then
    raise exception 'Approval request not found';
  end if;

  -- Check expiry
  if v_req.approval_token_expires_at < now() then
    raise exception 'This approval link has expired';
  end if;

  -- Check already responded
  if v_req.status != 'pending' then
    raise exception 'You have already responded to this request';
  end if;

  -- Update the request row
  update offer_approval_requests
  set
    status       = p_decision,
    note         = p_note,
    responded_at = now()
  where approval_token = p_token;

  -- Count remaining pending approvers for this offer
  select
    count(*) filter (where status = 'pending')   into v_pending_count
  from offer_approval_requests
  where offer_id = v_req.offer_id;

  select
    count(*) filter (where status = 'rejected')  into v_rejected_count
  from offer_approval_requests
  where offer_id = v_req.offer_id;

  -- If any rejected → mark offer rejected, back to draft
  if v_rejected_count > 0 then
    update offers
    set
      approval_status = 'rejected',
      status          = 'draft',
      approval_note   = p_note
    where id = v_req.offer_id;

    return json_build_object(
      'decision',    p_decision,
      'offer_id',    v_req.offer_id,
      'all_resolved', true,
      'outcome',     'rejected'
    );
  end if;

  -- If no pending left and none rejected → all approved
  if v_pending_count = 0 then
    update offers
    set approval_status = 'approved'
    where id = v_req.offer_id;

    return json_build_object(
      'decision',    p_decision,
      'offer_id',    v_req.offer_id,
      'all_resolved', true,
      'outcome',     'approved'
    );
  end if;

  -- Still waiting on others
  return json_build_object(
    'decision',    p_decision,
    'offer_id',    v_req.offer_id,
    'all_resolved', false,
    'outcome',     'pending'
  );
end;
$$;
