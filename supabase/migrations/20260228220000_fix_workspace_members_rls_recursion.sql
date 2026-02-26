-- Fix "infinite recursion detected in policy for relation workspace_members".
-- Policies that do EXISTS (SELECT from workspace_members) cause recursion. Use SECURITY DEFINER helpers instead.

-- Helper: true if current user is in this workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

-- Helper: true if current user is Admin in this workspace
CREATE OR REPLACE FUNCTION public.is_workspace_admin(ws_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid() AND role = 'Admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(UUID) TO authenticated;

-- workspace_members SELECT: own row OR any row in a workspace you're in (no self-query)
DROP POLICY IF EXISTS "Workspace members can view all members of their workspace" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view own workspace membership" ON public.workspace_members;
CREATE POLICY "Workspace members select own or same workspace"
  ON public.workspace_members
  FOR SELECT
  USING (user_id = auth.uid() OR is_workspace_member(workspace_id));

-- workspace_members UPDATE: own row OR Admin in same workspace (no self-query)
DROP POLICY IF EXISTS "Users can update own workspace membership" ON public.workspace_members;
CREATE POLICY "Users can update own or admin in workspace"
  ON public.workspace_members
  FOR UPDATE
  USING (user_id = auth.uid() OR (is_workspace_member(workspace_id) AND is_workspace_admin(workspace_id)))
  WITH CHECK (true);

-- workspaces SELECT: use helper so we don't query workspace_members in policy (would recurse)
DROP POLICY IF EXISTS "Workspace members can view their workspace" ON public.workspaces;
CREATE POLICY "Workspace members can view their workspace"
  ON public.workspaces
  FOR SELECT
  USING (is_workspace_member(id));
