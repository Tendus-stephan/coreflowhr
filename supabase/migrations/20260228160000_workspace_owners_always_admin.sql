-- Ensure every workspace owner has role Admin in workspace_members.
-- Idempotent: safe to run multiple times. Fixes owners incorrectly showing as Viewer.

UPDATE public.workspace_members wm
SET role = 'Admin'
FROM public.workspaces w
WHERE w.id = wm.workspace_id
  AND w.created_by = wm.user_id
  AND wm.role IS DISTINCT FROM 'Admin';
