-- Fix candidate_notes RLS so workspace members can insert/select/update/delete notes
-- Previously INSERT policy likely required the candidate to be owned by auth.uid(),
-- blocking team members from adding notes to candidates imported by others.

-- SELECT: any workspace member can read notes on workspace candidates
DROP POLICY IF EXISTS "Users can view candidate notes" ON public.candidate_notes;
CREATE POLICY "Workspace members can view candidate notes"
  ON public.candidate_notes FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_id
        AND (
          c.user_id = auth.uid()
          OR (c.workspace_id IS NOT NULL AND public.is_workspace_member(c.workspace_id))
        )
    )
  );

-- INSERT: any workspace member can add notes (user_id must be their own)
DROP POLICY IF EXISTS "Users can insert candidate notes" ON public.candidate_notes;
CREATE POLICY "Workspace members can insert candidate notes"
  ON public.candidate_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_id
        AND (
          c.user_id = auth.uid()
          OR (c.workspace_id IS NOT NULL AND public.is_workspace_member(c.workspace_id))
        )
    )
  );

-- UPDATE: users can only edit their own notes
DROP POLICY IF EXISTS "Users can update candidate notes" ON public.candidate_notes;
CREATE POLICY "Users can update own candidate notes"
  ON public.candidate_notes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: users can only delete their own notes
DROP POLICY IF EXISTS "Users can delete candidate notes" ON public.candidate_notes;
CREATE POLICY "Users can delete own candidate notes"
  ON public.candidate_notes FOR DELETE
  USING (user_id = auth.uid());
