-- Enforce: invited users can never be Admin. Only the workspace owner (created_by) is Admin.
-- 1) accept_workspace_invite: never assign Admin to a non-owner (override invite role if it says Admin).
-- 2) workspace_invites: disallow creating invites with role Admin.
-- 3) Trigger: owner always keeps Admin (cannot be demoted).

-- 1) accept_workspace_invite: invited users never get Admin
CREATE OR REPLACE FUNCTION public.accept_workspace_invite(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_inv public.workspace_invites%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_is_owner BOOLEAN := FALSE;
  v_final_role TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT *
  INTO v_inv
  FROM public.workspace_invites
  WHERE token = p_token
    AND expires_at > NOW()
    AND accepted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;

  IF (SELECT LOWER(email) FROM auth.users WHERE id = v_user_id) IS DISTINCT FROM LOWER(TRIM(v_inv.email)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This invitation was sent to ' || v_inv.email || '. Please log in or sign up with that email to accept.'
    );
  END IF;

  -- Only the workspace owner can ever be Admin. Invited users never get Admin.
  SELECT (w.created_by = v_user_id) INTO v_is_owner
  FROM public.workspaces w
  WHERE w.id = v_inv.workspace_id;

  v_final_role := COALESCE(NULLIF(TRIM(v_inv.role), ''), 'Recruiter');
  -- Invites cannot grant Admin: if invite says Admin (legacy/bug), treat as Viewer
  IF v_final_role = 'Admin' THEN
    v_final_role := 'Viewer';
  END IF;
  IF v_is_owner THEN
    v_final_role := 'Admin';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_inv.workspace_id, v_user_id, v_final_role)
  ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = v_final_role;

  UPDATE public.workspace_invites
  SET accepted_at = NOW()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_inv.workspace_id,
    'role', v_final_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(TEXT) TO authenticated;


-- 2) workspace_invites: disallow role = Admin (invites can only be Recruiter, HiringManager, Viewer)
-- Fix any existing invites that wrongly have Admin
UPDATE public.workspace_invites SET role = 'Viewer' WHERE role = 'Admin';

DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'workspace_invites' AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.workspace_invites DROP CONSTRAINT IF EXISTS %I', cname);
  END LOOP;
END $$;
ALTER TABLE public.workspace_invites
  ADD CONSTRAINT workspace_invites_role_no_admin
  CHECK (role IN ('Recruiter', 'HiringManager', 'Viewer'));


-- 3) Trigger: only owner can be Admin; owner always keeps Admin (cannot be demoted)
CREATE OR REPLACE FUNCTION public.workspace_members_enforce_one_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT created_by INTO v_owner_id FROM public.workspaces WHERE id = NEW.workspace_id;

  -- Owner must always be Admin (cannot demote the owner)
  IF v_owner_id = NEW.user_id THEN
    NEW.role := 'Admin';
    RETURN NEW;
  END IF;

  -- Non-owner can never be Admin (invited users stay Viewer/Recruiter/HiringManager)
  IF NEW.role = 'Admin' THEN
    NEW.role := 'Viewer';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_one_admin_per_workspace ON public.workspace_members;
CREATE TRIGGER enforce_one_admin_per_workspace
  BEFORE INSERT OR UPDATE OF role ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.workspace_members_enforce_one_admin();
