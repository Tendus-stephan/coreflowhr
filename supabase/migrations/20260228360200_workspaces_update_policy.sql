-- Allow workspace Admin/Recruiter to update their workspace (e.g. company_logo_url).
CREATE POLICY "Workspace admin or recruiter can update workspace"
  ON public.workspaces
  FOR UPDATE
  USING (public.is_workspace_admin_or_recruiter(id))
  WITH CHECK (public.is_workspace_admin_or_recruiter(id));
