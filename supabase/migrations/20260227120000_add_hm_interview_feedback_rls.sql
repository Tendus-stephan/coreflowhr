-- Allow Hiring Managers to view and submit interview feedback for interviews on their jobs.
-- Assumes interview_feedback table and base RLS already exist (e.g. from add_interview_feedback or schema).

-- Hiring managers can SELECT feedback for interviews on jobs where they are the hiring manager
CREATE POLICY "Hiring managers can view feedback for their jobs interviews"
  ON public.interview_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.candidates c ON c.id = i.candidate_id
      JOIN public.jobs j ON j.id = c.job_id
      WHERE i.id = interview_feedback.interview_id AND j.hiring_manager_id = auth.uid()
    )
  );

-- Hiring managers can INSERT feedback for those same interviews (with their own user_id)
CREATE POLICY "Hiring managers can insert feedback for their jobs interviews"
  ON public.interview_feedback FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.candidates c ON c.id = i.candidate_id
      JOIN public.jobs j ON j.id = c.job_id
      WHERE i.id = interview_feedback.interview_id AND j.hiring_manager_id = auth.uid()
    )
  );
