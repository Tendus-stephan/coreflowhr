-- Restrict Viewers at RLS level: they may only see candidates, offers, and interviews
-- for jobs they are assigned to (job_assignments). Previously, "workspace member" included
-- Viewer, so they could see all workspace data via direct Supabase SELECT.

-- Candidates: visible if owner OR job visible (HM, assigned Viewer, or Admin/Recruiter in workspace)
DROP POLICY IF EXISTS "Users can view own candidates" ON public.candidates;
CREATE POLICY "Users can view own candidates" ON public.candidates
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.jobs J
      WHERE J.id = candidates.job_id
        AND (
          J.hiring_manager_id = auth.uid()
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

-- Interviews: visible if owner OR candidate's job visible (same logic as jobs SELECT)
DROP POLICY IF EXISTS "Users can view own interviews" ON public.interviews;
CREATE POLICY "Users can view own interviews" ON public.interviews
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.candidates C
      JOIN public.jobs J ON J.id = C.job_id
      WHERE C.id = interviews.candidate_id
        AND (
          J.hiring_manager_id = auth.uid()
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

-- Offers: visible if owner OR candidate's job visible (same logic)
DROP POLICY IF EXISTS "Users can view their offers" ON public.offers;
CREATE POLICY "Users can view their offers" ON public.offers
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.candidates C
      JOIN public.jobs J ON J.id = C.job_id
      WHERE C.id = offers.candidate_id
        AND (
          J.hiring_manager_id = auth.uid()
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
