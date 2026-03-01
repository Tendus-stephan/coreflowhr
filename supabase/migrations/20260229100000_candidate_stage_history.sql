-- Stage history for reporting: every candidate stage change is logged.
-- Used by Reports (time-to-hire, pipeline conversion, source quality).

CREATE TABLE IF NOT EXISTS public.candidate_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_candidate_stage_history_candidate_id ON public.candidate_stage_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_stage_history_changed_at ON public.candidate_stage_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_candidate_stage_history_to_stage ON public.candidate_stage_history(to_stage);

COMMENT ON TABLE public.candidate_stage_history IS 'One row per candidate stage change for reporting (time-to-hire, pipeline conversion)';

-- Trigger: on candidates UPDATE, when stage changes insert one row into candidate_stage_history.
CREATE OR REPLACE FUNCTION public.track_candidate_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.candidate_stage_history (candidate_id, from_stage, to_stage, changed_at)
    VALUES (NEW.id, OLD.stage, NEW.stage, timezone('utc', now()));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_candidate_stage_change ON public.candidates;
CREATE TRIGGER after_candidate_stage_change
  AFTER UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.track_candidate_stage_change();

-- RLS: users can only see stage history for candidates they can see (same as candidates visibility).
ALTER TABLE public.candidate_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stage history for visible candidates"
  ON public.candidate_stage_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates C
      JOIN public.jobs J ON J.id = C.job_id
      WHERE C.id = candidate_stage_history.candidate_id
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

-- Service role / report functions will use SECURITY DEFINER to read; authenticated users get this policy.
