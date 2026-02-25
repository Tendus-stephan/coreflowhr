-- Allow anyone with the token to read invite email/role (so invite page can show "sent to X", no auth required)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_inv RECORD;
BEGIN
  SELECT email, role INTO v_inv
  FROM public.workspace_invites
  WHERE token = TRIM(p_token)
    AND expires_at > NOW()
    AND accepted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'email', v_inv.email,
    'role', v_inv.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO authenticated;
