-- Fix: non-admin workspace members were being sent to /?pricing=true after accepting
-- an invite even when the workspace admin had an active subscription.
--
-- Root cause: ProtectedRoute and postLoginRoute queried user_settings for all
-- workspace member IDs, but user_settings RLS (auth.uid() = user_id) silently
-- filtered the result to the current user's own row only. The invited user has
-- no subscription row → access = false → pricing redirect.
--
-- Fix: a SECURITY DEFINER function that bypasses RLS to check whether any Admin
-- in the workspace has subscription_status = 'active', OR the workspace has
-- is_free_access = true (with no expiry or a future expiry).
-- Callable by any authenticated user in the workspace.

CREATE OR REPLACE FUNCTION public.workspace_has_active_subscription(ws_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    -- Free-access design-partner workspaces
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = ws_id
        AND w.is_free_access = true
        AND (w.free_access_expires_at IS NULL OR w.free_access_expires_at > now())
    )
    OR
    -- Workspace admin has an active Stripe subscription
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      JOIN public.user_settings us ON us.user_id = wm.user_id
      WHERE wm.workspace_id = ws_id
        AND wm.role = 'Admin'
        AND lower(coalesce(us.subscription_status, '')) = 'active'
    );
$$;

GRANT EXECUTE ON FUNCTION public.workspace_has_active_subscription(UUID) TO authenticated;
