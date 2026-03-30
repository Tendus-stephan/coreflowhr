-- Fix: get_invite_by_token was filtering `accepted_at IS NULL`, so re-clicking an
-- already-accepted invite returned { found: false } → Invite.tsx showed "Invite expired"
-- instead of redirecting to /dashboard.
--
-- Fix: query without the accepted_at filter. Return already_accepted=true when the invite
-- was previously used, so the client can redirect straight to /dashboard.
-- Also add workspace_name to the response (already referenced in api.ts but never returned).

CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_inv RECORD;
BEGIN
  SELECT wi.email, wi.role, w.name AS workspace_name, wi.accepted_at, wi.expires_at
  INTO v_inv
  FROM public.workspace_invites wi
  LEFT JOIN public.workspaces w ON w.id = wi.workspace_id
  WHERE wi.token = TRIM(p_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Already accepted: tell the client so it can redirect to /dashboard immediately.
  -- We intentionally skip the expiry check here — if the user accepted the invite,
  -- it doesn't matter that the link has since expired; they're in the workspace.
  IF v_inv.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'found',            true,
      'email',            v_inv.email,
      'role',             v_inv.role,
      'workspace_name',   v_inv.workspace_name,
      'already_accepted', true
    );
  END IF;

  -- Unused and expired
  IF v_inv.expires_at <= NOW() THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- Valid, unused invite
  RETURN jsonb_build_object(
    'found',            true,
    'email',            v_inv.email,
    'role',             v_inv.role,
    'workspace_name',   v_inv.workspace_name,
    'already_accepted', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO authenticated;
