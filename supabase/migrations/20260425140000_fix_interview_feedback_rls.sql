-- Fix interview_feedback RLS: allow all workspace members to submit and view feedback.
-- Previously only hiring managers had INSERT/SELECT, causing "violates row-level security"
-- for admins and recruiters.

-- SELECT: any workspace member can read feedback for interviews in their workspace
CREATE POLICY "Workspace members can view interview feedback"
  ON public.interview_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.interviews i
      JOIN public.candidates c ON c.id = i.candidate_id
      JOIN public.jobs j ON j.id = c.job_id
      JOIN public.workspace_members wm ON wm.workspace_id = j.workspace_id
      WHERE i.id = interview_feedback.interview_id
        AND wm.user_id = auth.uid()
    )
  );

-- INSERT: any workspace member can submit their own feedback
CREATE POLICY "Workspace members can submit interview feedback"
  ON public.interview_feedback FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.interviews i
      JOIN public.candidates c ON c.id = i.candidate_id
      JOIN public.jobs j ON j.id = c.job_id
      JOIN public.workspace_members wm ON wm.workspace_id = j.workspace_id
      WHERE i.id = interview_feedback.interview_id
        AND wm.user_id = auth.uid()
    )
  );

-- UPDATE: users can update only their own feedback
CREATE POLICY "Users can update own interview feedback"
  ON public.interview_feedback FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
