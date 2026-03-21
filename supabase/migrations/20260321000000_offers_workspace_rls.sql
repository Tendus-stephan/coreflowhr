-- Fix offers SELECT policy so all workspace members see all workspace offers.
-- Old policy joined through candidates→jobs which excluded:
--   • general/draft offers with no candidate (only creator could see them)
--   • HiringManagers seeing offers they didn't create
-- New policy: any workspace member can SELECT offers in their workspace.

DROP POLICY IF EXISTS "Users can view their offers" ON public.offers;
CREATE POLICY "Users can view their offers" ON public.offers
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      offers.workspace_id IS NOT NULL
      AND public.is_workspace_member(offers.workspace_id)
    )
  );
