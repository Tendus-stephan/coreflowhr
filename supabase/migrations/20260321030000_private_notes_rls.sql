-- ISSUE-02: Enforce private notes at RLS level.
-- Previously, is_private was only filtered in application code, so any
-- workspace member could read private notes belonging to another user
-- by bypassing the app layer (e.g., direct API call with their own JWT).
--
-- The existing candidate_notes SELECT policy allows any workspace member to
-- read all notes on candidates in their workspace. We refine it to hide
-- private notes that belong to other users.

DROP POLICY IF EXISTS "Workspace members can view candidate notes" ON public.candidate_notes;

CREATE POLICY "Workspace members can view candidate notes" ON public.candidate_notes
  FOR SELECT USING (
    -- Owner always sees their own notes (public or private)
    auth.uid() = user_id

    -- Non-owner workspace members see only non-private notes
    OR (
      is_private = false
      AND EXISTS (
        SELECT 1 FROM public.candidates c
        JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
        WHERE c.id = candidate_notes.candidate_id
          AND wm.user_id = auth.uid()
      )
    )
  );
