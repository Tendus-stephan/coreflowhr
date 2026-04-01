-- SECURITY DEFINER function so authenticated users can insert notifications
-- for other members of their workspace without hitting the RLS policy
-- (RLS only allows users to insert their own notifications).

CREATE OR REPLACE FUNCTION broadcast_workspace_notification(
  p_actor_user_id UUID,
  p_type          TEXT,
  p_title         TEXT,
  p_desc          TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_category     TEXT;
BEGIN
  -- Resolve category from type (mirrors NotificationTypes.tsx)
  v_category := CASE p_type
    WHEN 'new_application'   THEN 'job'
    WHEN 'job_status_update' THEN 'job'
    WHEN 'job_expired'       THEN 'job'
    WHEN 'offer_accepted'    THEN 'job'
    WHEN 'offer_declined'    THEN 'job'
    WHEN 'interview_scheduled' THEN 'job'
    WHEN 'interview_cancelled' THEN 'job'
    WHEN 'candidate_added'   THEN 'candidate'
    WHEN 'candidate_moved'   THEN 'candidate'
    WHEN 'sourcing_complete' THEN 'automation'
    WHEN 'sourcing_failed'   THEN 'automation'
    WHEN 'workflow_success'  THEN 'automation'
    WHEN 'workflow_failed'   THEN 'automation'
    ELSE 'system'
  END;

  -- Find actor's workspace (prefer the workspace they own / are Admin in)
  SELECT workspace_id INTO v_workspace_id
  FROM workspace_members
  WHERE user_id = p_actor_user_id
  ORDER BY (role = 'Admin') DESC
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RETURN;
  END IF;

  -- Security check: caller must be a member of this workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE user_id = auth.uid() AND workspace_id = v_workspace_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  -- Insert one notification row per member, excluding the actor
  INSERT INTO notifications (user_id, title, "desc", type, category, unread)
  SELECT
    wm.user_id,
    p_title,
    p_desc,
    p_type,
    v_category,
    true
  FROM workspace_members wm
  WHERE wm.workspace_id = v_workspace_id
    AND wm.user_id <> p_actor_user_id;
END;
$$;

-- Only authenticated users can call this; the function itself enforces membership
REVOKE ALL ON FUNCTION broadcast_workspace_notification(UUID, TEXT, TEXT, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION broadcast_workspace_notification(UUID, TEXT, TEXT, TEXT) TO authenticated;
