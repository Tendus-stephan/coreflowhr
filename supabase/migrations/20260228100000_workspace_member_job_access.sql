-- Allow workspace members to view jobs (and related data) in their workspace.
-- Invited users (Recruiter/Hiring Manager) should see the same jobs as the workspace Admin, not create their own.

-- Jobs: SELECT if owner, hiring manager, OR member of the job's workspace
DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
CREATE POLICY "Users can view own jobs" ON public.jobs
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() = hiring_manager_id
    OR (
      workspace_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = jobs.workspace_id AND wm.user_id = auth.uid()
      )
    )
  );

-- Candidates: SELECT if owner OR in a job they can see (same workspace or HM)
DROP POLICY IF EXISTS "Users can view own candidates" ON public.candidates;
CREATE POLICY "Users can view own candidates" ON public.candidates
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.jobs J
      WHERE J.id = candidates.job_id
        AND (J.hiring_manager_id = auth.uid()
             OR (J.workspace_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM public.workspace_members wm
               WHERE wm.workspace_id = J.workspace_id AND wm.user_id = auth.uid()
             )))
    )
  );

-- Interviews: SELECT if owner OR candidate's job is visible (HM or workspace member)
DROP POLICY IF EXISTS "Users can view own interviews" ON public.interviews;
CREATE POLICY "Users can view own interviews" ON public.interviews
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.candidates C
      JOIN public.jobs J ON J.id = C.job_id
      WHERE C.id = interviews.candidate_id
        AND (J.hiring_manager_id = auth.uid()
             OR (J.workspace_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM public.workspace_members wm
               WHERE wm.workspace_id = J.workspace_id AND wm.user_id = auth.uid()
             )))
    )
  );

-- Offers: SELECT if owner OR candidate's job is visible
DROP POLICY IF EXISTS "Users can view their offers" ON public.offers;
CREATE POLICY "Users can view their offers" ON public.offers
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.candidates C
      JOIN public.jobs J ON J.id = C.job_id
      WHERE C.id = offers.candidate_id
        AND (J.hiring_manager_id = auth.uid()
             OR (J.workspace_id IS NOT NULL AND EXISTS (
               SELECT 1 FROM public.workspace_members wm
               WHERE wm.workspace_id = J.workspace_id AND wm.user_id = auth.uid()
             )))
    )
  );

-- Activity log: allow SELECT for workspace members (workspace_id scoped)
-- Only if activity_log has workspace_id; policy allows viewing if user is in that workspace
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'workspace_id'
  ) THEN
    DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_log;
    CREATE POLICY "Users can view own activity" ON public.activity_log
      FOR SELECT USING (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = activity_log.workspace_id AND wm.user_id = auth.uid()
        ))
      );
  END IF;
END $$;
