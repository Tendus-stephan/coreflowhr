-- Allow workspace members (Admin/Recruiter) to insert approval requests
create policy "workspace members can insert approval requests"
  on offer_approval_requests for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
      and role in ('Admin', 'Recruiter')
    )
  );
