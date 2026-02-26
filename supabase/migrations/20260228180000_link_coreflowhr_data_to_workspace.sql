-- One-time: link all jobs/candidates and related data owned by coreflowhr@gmail.com to one workspace and set user as Admin.
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent where possible).

DO $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = 'coreflowhr@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- 1) Get or create workspace owned by this user
  SELECT id INTO v_workspace_id FROM public.workspaces WHERE created_by = v_user_id LIMIT 1;
  IF v_workspace_id IS NULL THEN
    INSERT INTO public.workspaces (name, created_by)
    VALUES (COALESCE(NULLIF(TRIM((SELECT name FROM public.profiles WHERE id = v_user_id)), ''), 'CoreFlowHR'), v_user_id)
    RETURNING id INTO v_workspace_id;
  END IF;

  -- 2) Ensure user is Admin in this workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'Admin')
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'Admin';

  -- 3) Set created_by on workspace if it was null (e.g. created by backfill with no owner)
  UPDATE public.workspaces SET created_by = v_user_id WHERE id = v_workspace_id AND created_by IS NULL;

  -- 4) Link all user-owned data to this workspace
  UPDATE public.jobs           SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
  UPDATE public.candidates     SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
  UPDATE public.interviews     SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
  UPDATE public.offers         SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
  UPDATE public.activity_log   SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
  UPDATE public.notifications  SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
  UPDATE public.clients        SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
  UPDATE public.user_settings  SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
  UPDATE public.email_templates SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
  UPDATE public.job_templates  SET workspace_id = v_workspace_id WHERE user_id = v_user_id;

  -- 5) Candidates may have been backfilled by job; ensure any with null workspace_id get it from their job
  UPDATE public.candidates c
  SET workspace_id = j.workspace_id
  FROM public.jobs j
  WHERE c.job_id = j.id AND (c.workspace_id IS NULL OR c.workspace_id <> j.workspace_id);

  -- 6) Offer templates and workflows (by user_id if column exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'offer_templates' AND column_name = 'user_id') THEN
    UPDATE public.offer_templates SET workspace_id = v_workspace_id WHERE user_id = v_user_id;
  END IF;
  UPDATE public.email_workflows ew
  SET workspace_id = et.workspace_id
  FROM public.email_templates et
  WHERE et.id = ew.email_template_id AND ew.workspace_id IS DISTINCT FROM et.workspace_id;
  UPDATE public.workflow_executions we
  SET workspace_id = ew.workspace_id
  FROM public.email_workflows ew
  WHERE ew.id = we.workflow_id AND we.workspace_id IS DISTINCT FROM ew.workspace_id;
END $$;
