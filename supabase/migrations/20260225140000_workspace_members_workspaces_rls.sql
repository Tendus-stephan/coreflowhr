-- Allow workspace members to see ALL members of their workspace (so Team & Access list shows everyone).
-- Without this, RLS or default behaviour can restrict SELECT to only the current user's row.

-- Ensure RLS is enabled
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- workspace_members: allow SELECT for any row where the current user is in the same workspace
DROP POLICY IF EXISTS "Workspace members can view all members of their workspace" ON public.workspace_members;
CREATE POLICY "Workspace members can view all members of their workspace"
  ON public.workspace_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- workspace_members: INSERT is done by accept_workspace_invite (SECURITY DEFINER), so no client INSERT policy needed.
-- Allow UPDATE: own row (any member), or any row in the same workspace if current user is Admin (for role changes in Team & Access).
DROP POLICY IF EXISTS "Users can update own workspace membership" ON public.workspace_members;
CREATE POLICY "Users can update own workspace membership"
  ON public.workspace_members
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'Admin'
    )
  )
  WITH CHECK (true);

-- workspaces: allow SELECT for workspaces the user is a member of
DROP POLICY IF EXISTS "Workspace members can view their workspace" ON public.workspaces;
CREATE POLICY "Workspace members can view their workspace"
  ON public.workspaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id
        AND wm.user_id = auth.uid()
    )
  );
