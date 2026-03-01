-- email_logs RLS: so inbound replies are visible and only to users who can see the candidate
-- Without RLS, all authenticated users might see all logs; with this, visibility matches candidate access.

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: same visibility as candidates (owner, HM, job-assigned viewer, or Admin/Recruiter in job's workspace)
DROP POLICY IF EXISTS "Users can view email logs for visible candidates" ON public.email_logs;
CREATE POLICY "Users can view email logs for visible candidates" ON public.email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.candidates C
      JOIN public.jobs J ON J.id = C.job_id
      WHERE C.id = email_logs.candidate_id
        AND (
          C.user_id = auth.uid()
          OR J.hiring_manager_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.job_assignments ja WHERE ja.job_id = J.id AND ja.user_id = auth.uid())
          OR (
            J.workspace_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.workspace_members wm
              WHERE wm.workspace_id = J.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('Admin', 'Recruiter')
            )
          )
        )
    )
  );

-- UPDATE: allow marking inbound as read if user can see the candidate (same visibility as SELECT)
DROP POLICY IF EXISTS "Users can update read flag for visible candidate emails" ON public.email_logs;
CREATE POLICY "Users can update read flag for visible candidate emails" ON public.email_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.candidates C
      JOIN public.jobs J ON J.id = C.job_id
      WHERE C.id = email_logs.candidate_id
        AND (
          C.user_id = auth.uid()
          OR J.hiring_manager_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.job_assignments ja WHERE ja.job_id = J.id AND ja.user_id = auth.uid())
          OR (
            J.workspace_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.workspace_members wm
              WHERE wm.workspace_id = J.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('Admin', 'Recruiter')
            )
          )
        )
    )
  )
  WITH CHECK (true);

-- INSERT/DELETE: only via service role (edge functions). No policy = deny for authenticated users.
