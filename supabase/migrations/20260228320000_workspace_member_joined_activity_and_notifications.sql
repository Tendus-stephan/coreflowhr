-- When a user joins a workspace (INSERT into workspace_members), log to activity_log and notify other members.
-- Only runs on INSERT (not on ON CONFLICT DO UPDATE).

CREATE OR REPLACE FUNCTION public.on_workspace_member_inserted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_joiner_name TEXT;
  v_workspace_name TEXT;
  v_other_member RECORD;
BEGIN
  -- Display name for the person who joined
  SELECT COALESCE(
    (SELECT btrim(p.name) FROM public.profiles p WHERE p.id = NEW.user_id AND btrim(p.name) <> '' AND lower(btrim(p.name)) <> 'user'),
    (SELECT split_part(email, '@', 1) FROM auth.users WHERE id = NEW.user_id),
    'A team member'
  ) INTO v_joiner_name;

  -- Workspace name for activity target
  SELECT COALESCE(w.name, 'the workspace') INTO v_workspace_name
  FROM public.workspaces w WHERE w.id = NEW.workspace_id;

  -- Activity log: "X joined the workspace" (visible to all workspace members via workspace_id)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'workspace_id') THEN
    INSERT INTO public.activity_log (user_id, user_name, action, target, target_to, workspace_id)
    VALUES (NEW.user_id, v_joiner_name, 'joined the workspace', v_workspace_name, NULL, NEW.workspace_id);
  ELSE
    INSERT INTO public.activity_log (user_id, user_name, action, target, target_to)
    VALUES (NEW.user_id, v_joiner_name, 'joined the workspace', v_workspace_name, NULL);
  END IF;

  -- Notify other workspace members (not the person who just joined)
  FOR v_other_member IN
    SELECT user_id FROM public.workspace_members
    WHERE workspace_id = NEW.workspace_id AND user_id <> NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, title, "desc", type, category, unread)
    VALUES (
      v_other_member.user_id,
      'New team member',
      v_joiner_name || ' joined ' || v_workspace_name || '.',
      'member_joined',
      'system',
      true
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_workspace_member_joined ON public.workspace_members;
CREATE TRIGGER trigger_workspace_member_joined
  AFTER INSERT ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.on_workspace_member_inserted();
