-- Fix: non-admin members could escalate their own role by updating their own workspace_members row.
-- The previous policy allowed user_id = auth.uid() to UPDATE with WITH CHECK (true),
-- meaning a Viewer could set role = 'Recruiter' directly via the API.
-- Fix: only Admins can UPDATE workspace_members rows (role changes).

DROP POLICY IF EXISTS "Users can update own or admin in workspace" ON public.workspace_members;

CREATE POLICY "Only admins can update workspace member roles"
  ON public.workspace_members
  FOR UPDATE
  USING (public.is_workspace_admin(workspace_id))
  WITH CHECK (true);
