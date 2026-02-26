-- One-time fix: make coreflowhr@gmail.com Admin and fix workspace ownership if needed.
-- For linking all their jobs/candidates to one workspace, run 20260228180000_link_coreflowhr_data_to_workspace.sql instead.
-- Run this in Supabase SQL Editor if the RPC + app still show Viewer.

-- 1) Set created_by on any workspace that has no owner but has this user as a member
UPDATE public.workspaces w
SET created_by = wm.user_id
FROM public.workspace_members wm
JOIN auth.users u ON u.id = wm.user_id AND LOWER(u.email) = 'coreflowhr@gmail.com'
WHERE w.id = wm.workspace_id
  AND w.created_by IS NULL;

-- 2) Ensure this user is Admin in every workspace they own (or workspace has no owner)
UPDATE public.workspace_members wm
SET role = 'Admin'
FROM public.workspaces w, auth.users u
WHERE w.id = wm.workspace_id
  AND wm.user_id = u.id
  AND LOWER(u.email) = 'coreflowhr@gmail.com'
  AND (w.created_by = wm.user_id OR w.created_by IS NULL);

-- 3) If they own a workspace but have no membership row, add them as Admin
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT w.id, u.id, 'Admin'
FROM public.workspaces w
JOIN auth.users u ON u.id = w.created_by AND LOWER(u.email) = 'coreflowhr@gmail.com'
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'Admin';
