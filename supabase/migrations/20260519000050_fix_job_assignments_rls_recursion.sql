-- Fix infinite recursion: job_assignments ALL policy queried jobs directly,
-- which triggered the jobs SELECT policy, which queried job_assignments again.
--
-- Solution: SECURITY DEFINER helper to fetch a job's workspace_id without
-- going through RLS on jobs, then pass it to the existing
-- is_workspace_admin_or_recruiter() helper (also SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.get_job_workspace_id(p_job_id UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT workspace_id FROM public.jobs WHERE id = p_job_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_job_workspace_id(UUID) TO authenticated;

-- Replace the recursive ALL policy with one that uses the helper functions.
DROP POLICY IF EXISTS "Workspace admins and recruiters manage job_assignments" ON public.job_assignments;

CREATE POLICY "Workspace admins and recruiters manage job_assignments"
  ON public.job_assignments FOR ALL
  USING (
    public.is_workspace_admin_or_recruiter(public.get_job_workspace_id(job_id))
  )
  WITH CHECK (
    public.is_workspace_admin_or_recruiter(public.get_job_workspace_id(job_id))
  );
