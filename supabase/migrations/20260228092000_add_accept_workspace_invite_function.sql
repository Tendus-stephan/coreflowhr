-- Accept workspace invite by token and add the current user as a member.
-- This function runs as SECURITY DEFINER to bypass RLS on workspace_invites/workspace_members.

CREATE OR REPLACE FUNCTION public.accept_workspace_invite(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_inv public.workspace_invites%ROWTYPE;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find a valid, unaccepted invite by token
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

  -- Only the person the invite was sent to can accept it (prevents admin clicking link and losing Admin role)
  IF (SELECT LOWER(email) FROM auth.users WHERE id = v_user_id) IS DISTINCT FROM LOWER(TRIM(v_inv.email)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This invitation was sent to ' || v_inv.email || '. Please log in or sign up with that email to accept.'
    );
  END IF;

  -- Create or update membership for this workspace/user
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_inv.workspace_id, v_user_id, v_inv.role)
  ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

  -- Mark invite as accepted
  UPDATE public.workspace_invites
  SET accepted_at = NOW()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_inv.workspace_id,
    'role', v_inv.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(TEXT) TO authenticated;

