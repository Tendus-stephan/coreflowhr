-- Fix ALL accounts that are workspace owners but show as Viewer.
-- Root cause: accept_workspace_invite used to overwrite owner's Admin with invite role (e.g. Viewer).
-- See docs/WORKSPACE_VIEWER_ROOT_CAUSE.md.

-- 1) Workspaces with no owner: set created_by to the first Admin (or any member) so we have an owner
UPDATE public.workspaces w
SET created_by = wm.user_id
FROM (
  SELECT DISTINCT ON (workspace_id) workspace_id, user_id
  FROM public.workspace_members
  WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE created_by IS NULL)
  ORDER BY workspace_id, CASE role WHEN 'Admin' THEN 0 WHEN 'Recruiter' THEN 1 WHEN 'HiringManager' THEN 2 ELSE 3 END
) wm
WHERE w.id = wm.workspace_id AND w.created_by IS NULL;

-- 2) Every workspace owner must be Admin in workspace_members (idempotent)
UPDATE public.workspace_members wm
SET role = 'Admin'
FROM public.workspaces w
WHERE w.id = wm.workspace_id
  AND w.created_by = wm.user_id
  AND wm.role IS DISTINCT FROM 'Admin';

-- 3) Users who own jobs but have no workspace membership: create workspace and add them as Admin
DO $$
DECLARE
  r RECORD;
  v_workspace_id UUID;
BEGIN
  FOR r IN
    SELECT DISTINCT j.user_id AS uid
    FROM public.jobs j
    WHERE j.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = j.user_id)
  LOOP
    SELECT id INTO v_workspace_id FROM public.workspaces WHERE created_by = r.uid LIMIT 1;
    IF v_workspace_id IS NULL THEN
      INSERT INTO public.workspaces (name, created_by)
      VALUES (COALESCE(NULLIF(TRIM((SELECT name FROM public.profiles WHERE id = r.uid)), ''), 'My Workspace'), r.uid)
      RETURNING id INTO v_workspace_id;
    END IF;
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, r.uid, 'Admin')
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'Admin';
  END LOOP;
END $$;

-- 4) Link orphan jobs (user_id set but workspace_id null or wrong) to a workspace the user owns
UPDATE public.jobs j
SET workspace_id = w.id
FROM public.workspaces w
WHERE w.created_by = j.user_id
  AND j.user_id IS NOT NULL
  AND (j.workspace_id IS NULL OR j.workspace_id <> w.id);

-- 5) Same for candidates
UPDATE public.candidates c
SET workspace_id = w.id
FROM public.workspaces w
WHERE w.created_by = c.user_id
  AND c.user_id IS NOT NULL
  AND (c.workspace_id IS NULL OR c.workspace_id <> w.id);
