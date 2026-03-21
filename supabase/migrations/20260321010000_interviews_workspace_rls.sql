-- Allow all workspace members (Admin, Recruiter, HiringManager) to see
-- interviews that belong to their workspace via interviews.workspace_id.
-- The previous policy only granted access via the candidate→job→workspace chain
-- which failed for pool candidates and non-assigned members.

DROP POLICY IF EXISTS "Users can view own interviews" ON public.interviews;

CREATE POLICY "Users can view own interviews" ON public.interviews
  FOR SELECT USING (
    -- Owner always sees their own interviews
    auth.uid() = user_id

    -- Any workspace member (non-Viewer) sees all workspace interviews directly
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = interviews.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.role IN ('Admin', 'Recruiter', 'HiringManager')
      )
    )

    -- Viewers and job-assigned users still see interviews via candidate→job access
    OR EXISTS (
      SELECT 1 FROM public.candidates C
      JOIN public.jobs J ON J.id = C.job_id
      WHERE C.id = interviews.candidate_id
        AND (
          J.hiring_manager_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.job_assignments ja
            WHERE ja.job_id = J.id AND ja.user_id = auth.uid()
          )
        )
    )
  );
