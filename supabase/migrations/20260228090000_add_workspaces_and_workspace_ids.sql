-- Workspaces and workspace-scoped data model
-- ------------------------------------------
-- 1) Create workspaces and workspace_members tables
-- 2) Backfill a workspace per existing profile (owner = profile.id)
-- 3) Create workspace membership rows with roles
-- 4) Add workspace_id to key tables and backfill from workspace_members

-- 1. Workspaces and workspace_members
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Recruiter', 'HiringManager')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);

-- 2. Backfill: create one workspace per existing profile (owner)
INSERT INTO public.workspaces (id, name, created_by)
SELECT
  gen_random_uuid(),
  COALESCE(NULLIF(p.name, ''), 'Workspace ' || LEFT(p.id::text, 8)),
  p.id
FROM public.profiles p
LEFT JOIN public.workspaces w ON w.created_by = p.id
WHERE w.id IS NULL;

-- 3. Backfill: create workspace_members rows for each workspace owner
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT
  w.id,
  w.created_by,
  CASE 
    WHEN p.role IN ('Admin', 'Recruiter', 'HiringManager') THEN p.role
    WHEN p.role IS NULL OR p.role = '' THEN 'Admin'
    ELSE 'Admin'
  END AS role
FROM public.workspaces w
JOIN public.profiles p ON p.id = w.created_by
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 4. Add workspace_id to core domain tables and backfill

-- Jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.jobs j
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = j.user_id AND j.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id ON public.jobs(workspace_id);

-- Candidates
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.candidates c
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = c.user_id AND c.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_workspace_id ON public.candidates(workspace_id);

-- Interviews
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.interviews i
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = i.user_id AND i.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_interviews_workspace_id ON public.interviews(workspace_id);

-- Offers
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.offers o
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = o.user_id AND o.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_offers_workspace_id ON public.offers(workspace_id);

-- Offer templates
ALTER TABLE public.offer_templates
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.offer_templates ot
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = ot.user_id AND ot.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_offer_templates_workspace_id ON public.offer_templates(workspace_id);

-- Clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.clients cl
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = cl.user_id AND cl.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_workspace_id ON public.clients(workspace_id);

-- User settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.user_settings us
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = us.user_id AND us.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_settings_workspace_id ON public.user_settings(workspace_id);

-- Activity log
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.activity_log al
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = al.user_id AND al.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON public.activity_log(workspace_id);

-- Notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.notifications n
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = n.user_id AND n.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON public.notifications(workspace_id);

-- Email templates
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.email_templates et
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = et.user_id AND et.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_templates_workspace_id ON public.email_templates(workspace_id);

-- Email workflows
ALTER TABLE public.email_workflows
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.email_workflows ew
SET workspace_id = et.workspace_id
FROM public.email_templates et
WHERE et.id = ew.email_template_id AND ew.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_email_workflows_workspace_id ON public.email_workflows(workspace_id);

-- Workflow executions
ALTER TABLE public.workflow_executions
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.workflow_executions we
SET workspace_id = ew.workspace_id
FROM public.email_workflows ew
WHERE ew.id = we.workflow_id AND we.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workspace_id ON public.workflow_executions(workspace_id);

-- Job templates
ALTER TABLE public.job_templates
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

UPDATE public.job_templates jt
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = jt.user_id AND jt.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_templates_workspace_id ON public.job_templates(workspace_id);

