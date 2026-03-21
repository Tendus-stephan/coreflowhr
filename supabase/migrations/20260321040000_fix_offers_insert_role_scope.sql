-- ISSUE-04: Scope the role exclusion check to the offer's workspace.
-- Previous policies used a role check without a workspace_id filter, meaning
-- a user who is HiringManager in workspace A was blocked from creating offers
-- in workspace B where they are Admin or Recruiter.

-- INSERT: only Admin/Recruiter in the target workspace may create offers
DROP POLICY IF EXISTS "Users can create their offers" ON public.offers;
CREATE POLICY "Users can create their offers" ON public.offers
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = offers.workspace_id
        AND wm.role IN ('Admin', 'Recruiter')
    )
  );

-- UPDATE: only Admin/Recruiter in the offer's workspace may update
DROP POLICY IF EXISTS "Users can update their offers" ON public.offers;
CREATE POLICY "Users can update their offers" ON public.offers
  FOR UPDATE
  USING (
    (user_id = auth.uid() OR true)
    AND EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = offers.workspace_id
        AND wm.role IN ('Admin', 'Recruiter')
    )
  )
  WITH CHECK (true);

-- DELETE: only Admin/Recruiter in the offer's workspace may delete
DROP POLICY IF EXISTS "Users can delete their offers" ON public.offers;
CREATE POLICY "Users can delete their offers" ON public.offers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.workspace_id = offers.workspace_id
        AND wm.role IN ('Admin', 'Recruiter')
    )
  );
