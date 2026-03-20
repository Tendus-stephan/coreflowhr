-- 1. Enable Realtime for the tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;

-- 2. Fix email_logs SELECT policy.
-- Old policy joined through jobs.workspace_id which failed when
-- jobs had no workspace_id or candidate had no job. New policy checks
-- workspace membership directly on candidates.workspace_id.
DROP POLICY IF EXISTS "Users can view email logs for visible candidates" ON public.email_logs;
CREATE POLICY "Users can view email logs for visible candidates" ON public.email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = email_logs.candidate_id
        AND (
          c.user_id = auth.uid()
          OR (c.workspace_id IS NOT NULL AND public.is_workspace_member(c.workspace_id))
          OR EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = c.job_id
              AND (
                j.hiring_manager_id = auth.uid()
                OR EXISTS (
                  SELECT 1 FROM public.job_assignments ja
                  WHERE ja.job_id = j.id AND ja.user_id = auth.uid()
                )
              )
          )
        )
    )
  );

-- UPDATE (mark read) — same simplified logic
DROP POLICY IF EXISTS "Users can update read flag for visible candidate emails" ON public.email_logs;
CREATE POLICY "Users can update read flag for visible candidate emails" ON public.email_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = email_logs.candidate_id
        AND (
          c.user_id = auth.uid()
          OR (c.workspace_id IS NOT NULL AND public.is_workspace_member(c.workspace_id))
          OR EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = c.job_id
              AND (
                j.hiring_manager_id = auth.uid()
                OR EXISTS (
                  SELECT 1 FROM public.job_assignments ja
                  WHERE ja.job_id = j.id AND ja.user_id = auth.uid()
                )
              )
          )
        )
    )
  )
  WITH CHECK (true);
