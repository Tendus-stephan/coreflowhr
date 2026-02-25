-- 1) Add Viewer role to workspace_invites and workspace_members
-- 2) job_assignments: links users (Viewers / optional HM) to specific jobs for "their jobs only" scope

-- Allow inviting as Viewer (drop existing role check and add new one including Viewer)
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'workspace_invites' AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.workspace_invites DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;
ALTER TABLE public.workspace_invites
  ADD CONSTRAINT workspace_invites_role_check
  CHECK (role IN ('Admin', 'Recruiter', 'HiringManager', 'Viewer'));

-- job_assignments: which jobs a user (Viewer or HM) can see when scope is "their jobs only"
CREATE TABLE IF NOT EXISTS public.job_assignments (
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (job_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_job_assignments_user_id ON public.job_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id ON public.job_assignments(job_id);

ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

-- Only workspace Admin/Recruiter can manage job_assignments (assign Viewers to jobs)
CREATE POLICY "Workspace admins and recruiters manage job_assignments"
  ON public.job_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.workspace_members wm ON wm.workspace_id = j.workspace_id AND wm.user_id = auth.uid()
      WHERE j.id = job_assignments.job_id AND wm.role IN ('Admin', 'Recruiter')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      JOIN public.workspace_members wm ON wm.workspace_id = j.workspace_id AND wm.user_id = auth.uid()
      WHERE j.id = job_assignments.job_id AND wm.role IN ('Admin', 'Recruiter')
    )
  );

-- Users can read their own assignments
CREATE POLICY "Users can view own job_assignments"
  ON public.job_assignments FOR SELECT
  USING (user_id = auth.uid());

-- 3) Jobs SELECT: Viewer sees only jobs in job_assignments; HM sees only hiring_manager_id; Admin/Recruiter see all workspace jobs
DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
CREATE POLICY "Users can view own jobs" ON public.jobs
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = hiring_manager_id
    OR EXISTS (SELECT 1 FROM public.job_assignments ja WHERE ja.job_id = jobs.id AND ja.user_id = auth.uid())
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = jobs.workspace_id AND wm.user_id = auth.uid()
        AND wm.role IN ('Admin', 'Recruiter')
      )
    )
  );
