-- Backfill workspace_id on email_workflows that were created before the
-- workspace_id was included in the insert. Joins via profiles → workspace_members
-- to find the workspace for each workflow's user_id.

UPDATE public.email_workflows ew
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE ew.workspace_id IS NULL
  AND ew.user_id = wm.user_id;
