-- Self-heal: ensure current user is Admin for every workspace they own (created_by).
-- Inserts missing owner row or updates existing row to Admin. Fixes "still Viewer" when owner had no row or wrong role.

CREATE OR REPLACE FUNCTION public.ensure_workspace_owner_admin()
RETURNS void AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  SELECT w.id, auth.uid(), 'Admin'
  FROM public.workspaces w
  WHERE w.created_by = auth.uid()
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'Admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.ensure_workspace_owner_admin() TO authenticated;
