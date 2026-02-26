-- Run this entire script in Supabase SQL Editor once.
-- Makes tendusstephan@gmail.com and coreflowhr@gmail.com Admin and links their data.

CREATE OR REPLACE FUNCTION public.fix_two_emails_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_name TEXT;
  v_email TEXT;
BEGIN
  FOR v_email IN SELECT unnest(ARRAY['tendusstephan@gmail.com', 'coreflowhr@gmail.com'])
  LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(v_email) LIMIT 1;
    IF v_user_id IS NULL THEN
      RAISE NOTICE 'User not found: %', v_email;
      CONTINUE;
    END IF;

    SELECT id INTO v_workspace_id FROM public.workspaces WHERE created_by = v_user_id LIMIT 1;
    IF v_workspace_id IS NULL THEN
      SELECT COALESCE(NULLIF(TRIM(p.name), ''), split_part(u.email, '@', 1), 'My Workspace')
        INTO v_name
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE u.id = v_user_id;
      v_name := COALESCE(v_name, 'My Workspace');
      INSERT INTO public.workspaces (name, created_by)
      VALUES (v_name, v_user_id)
      RETURNING id INTO v_workspace_id;
    END IF;

    UPDATE public.workspaces SET created_by = v_user_id WHERE id = v_workspace_id AND created_by IS NULL;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, v_user_id, 'Admin')
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'Admin';

    UPDATE public.jobs SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
    UPDATE public.candidates SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
    UPDATE public.interviews SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
    UPDATE public.offers SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
    UPDATE public.activity_log SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
    UPDATE public.notifications SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
    UPDATE public.clients SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_settings' AND column_name = 'workspace_id') THEN
      UPDATE public.user_settings SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'workspace_id') THEN
      UPDATE public.email_templates SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'job_templates' AND column_name = 'workspace_id') THEN
      UPDATE public.job_templates SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'offer_templates' AND column_name = 'user_id') THEN
      UPDATE public.offer_templates SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
    END IF;

    v_workspace_id := NULL;
    v_user_id := NULL;
  END LOOP;

  UPDATE public.workspace_members wm
  SET role = 'Admin'
  FROM public.workspaces w
  WHERE w.id = wm.workspace_id
    AND w.created_by = wm.user_id
    AND wm.user_id IN (SELECT id FROM auth.users WHERE LOWER(email) IN ('tendusstephan@gmail.com', 'coreflowhr@gmail.com'))
    AND wm.role IS DISTINCT FROM 'Admin';
END;
$$;

SELECT public.fix_two_emails_admin();

DROP FUNCTION public.fix_two_emails_admin();
