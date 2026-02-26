-- accept_workspace_invite: never throw — return all errors as JSONB so the client can show the real message
-- (e.g. "This invitation was sent to X. Please log in or sign up with that email to accept.")

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
  WHERE token = TRIM(p_token)
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

  SELECT (w.created_by = v_user_id) INTO v_is_owner
  FROM public.workspaces w
  WHERE w.id = v_inv.workspace_id;

  v_final_role := COALESCE(NULLIF(TRIM(v_inv.role), ''), 'Recruiter');
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
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(SQLERRM, 'Something went wrong. Please try again or use a new invite link.'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(TEXT) TO authenticated;
