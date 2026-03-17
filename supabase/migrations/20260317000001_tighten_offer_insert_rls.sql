-- Block Viewer role from creating or updating offers at DB level.
-- Previously the INSERT policy only checked user_id = auth.uid() (ownership),
-- not whether the user has permission to create offers.
-- Viewers are read-only; only Admin and Recruiter can write offers.

DROP POLICY IF EXISTS "Users can create their offers" ON public.offers;
CREATE POLICY "Users can create their offers" ON public.offers
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('Viewer', 'HiringManager')
    )
  );

-- Also tighten UPDATE: Viewer and HiringManager cannot update offers
DROP POLICY IF EXISTS "Users can update their offers" ON public.offers;
CREATE POLICY "Users can update their offers" ON public.offers
  FOR UPDATE
  USING (
    (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = offers.job_id
          AND j.workspace_id IS NOT NULL
          AND public.is_workspace_admin_or_recruiter(j.workspace_id)
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('Viewer', 'HiringManager')
    )
  )
  WITH CHECK (true);

-- DELETE: same — Viewer and HiringManager cannot delete offers
DROP POLICY IF EXISTS "Users can delete their offers" ON public.offers;
CREATE POLICY "Users can delete their offers" ON public.offers
  FOR DELETE
  USING (
    (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = offers.job_id
          AND j.workspace_id IS NOT NULL
          AND public.is_workspace_admin_or_recruiter(j.workspace_id)
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role IN ('Viewer', 'HiringManager')
    )
  );
