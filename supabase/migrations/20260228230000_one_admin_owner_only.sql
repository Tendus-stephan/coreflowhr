-- Only the workspace owner (workspaces.created_by) can be Admin. No second Admin.
-- Fixes: invited Viewer (chidera.ezetendu@pau.edu.ng) was wrongly set to Admin by a prior migration.

-- 1) Demote any member who is Admin but NOT the workspace owner → Viewer
UPDATE public.workspace_members wm
SET role = 'Viewer'
FROM public.workspaces w
WHERE w.id = wm.workspace_id
  AND wm.role = 'Admin'
  AND w.created_by IS DISTINCT FROM wm.user_id;

-- 2) If a workspace has no Admin (e.g. we demoted the wrong created_by), assign owner to first Recruiter/HiringManager/Viewer so one Admin can exist
UPDATE public.workspaces w
SET created_by = wm.user_id
FROM (
  SELECT DISTINCT ON (workspace_id) workspace_id, user_id
  FROM public.workspace_members
  WHERE workspace_id IN (
    SELECT id FROM public.workspaces w2
    WHERE NOT EXISTS (
      SELECT 1 FROM public.workspace_members wm2
      WHERE wm2.workspace_id = w2.id AND wm2.role = 'Admin'
    )
  )
  ORDER BY workspace_id, CASE role WHEN 'Recruiter' THEN 0 WHEN 'HiringManager' THEN 1 WHEN 'Viewer' THEN 2 END
) wm
WHERE w.id = wm.workspace_id
  AND NOT EXISTS (SELECT 1 FROM public.workspace_members wm0 WHERE wm0.workspace_id = w.id AND wm0.role = 'Admin');

-- 3) Ensure the (single) owner has Admin
UPDATE public.workspace_members wm
SET role = 'Admin'
FROM public.workspaces w
WHERE w.id = wm.workspace_id AND w.created_by = wm.user_id AND wm.role IS DISTINCT FROM 'Admin';

-- 5) Trigger: only the workspace owner can have role Admin
CREATE OR REPLACE FUNCTION public.workspace_members_enforce_one_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  IF NEW.role = 'Admin' THEN
    SELECT created_by INTO v_owner_id FROM public.workspaces WHERE id = NEW.workspace_id;
    IF v_owner_id IS DISTINCT FROM NEW.user_id THEN
      NEW.role := 'Viewer';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_one_admin_per_workspace ON public.workspace_members;
CREATE TRIGGER enforce_one_admin_per_workspace
  BEFORE INSERT OR UPDATE OF role ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.workspace_members_enforce_one_admin();
