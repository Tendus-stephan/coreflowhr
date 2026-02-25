-- One-time fix: Restore Admin role for users who own a workspace but had their role overwritten (e.g. by accepting an invite while logged in).
-- Run this in Supabase SQL Editor.

-- Option A: Restore Admin for a specific email (e.g. your main account)
UPDATE public.workspace_members wm
SET role = 'Admin'
FROM public.workspaces w
WHERE wm.workspace_id = w.id
  AND w.created_by = wm.user_id
  AND wm.user_id = (SELECT id FROM auth.users WHERE email = 'coreflowhr@gmail.com');

-- Option B: Restore Admin for ALL workspace owners (in case multiple accounts were affected)
-- Uncomment and run if you prefer this:
/*
UPDATE public.workspace_members wm
SET role = 'Admin'
FROM public.workspaces w
WHERE wm.workspace_id = w.id
  AND w.created_by = wm.user_id;
*/
