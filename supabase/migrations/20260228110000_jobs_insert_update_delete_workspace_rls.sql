-- Restrict jobs INSERT/UPDATE/DELETE so invited users (Hiring Manager / Recruiter) cannot create their own jobs.
-- Only workspace Admin or Recruiter can create jobs; job owner or workspace Admin/Recruiter can update/delete.

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- INSERT: only workspace Admin or Recruiter, and job must have that workspace_id
DROP POLICY IF EXISTS "Workspace Admin/Recruiter can insert jobs" ON public.jobs;
CREATE POLICY "Workspace Admin/Recruiter can insert jobs" ON public.jobs
  FOR INSERT
  WITH CHECK (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = jobs.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('Admin', 'Recruiter')
    )
  );

-- UPDATE: job owner OR workspace Admin/Recruiter
DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Workspace Admin/Recruiter can update jobs" ON public.jobs;
CREATE POLICY "Workspace Admin/Recruiter can update jobs" ON public.jobs
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = jobs.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('Admin', 'Recruiter')
      )
    )
  );

-- DELETE: Admin only (permission matrix)
DROP POLICY IF EXISTS "Users can delete own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Workspace Admin/Recruiter can delete jobs" ON public.jobs;
CREATE POLICY "Only Admin can delete jobs" ON public.jobs
  FOR DELETE
  USING (
    workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = jobs.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'Admin'
    )
  );
