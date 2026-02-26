-- RLS on workspace_members was self-referential: "see row if EXISTS (select from workspace_members where user_id = you)".
-- Under RLS the inner SELECT sees no rows, so you never see your own row → app gets 0 rows and shows Viewer.
-- Add policy: users can always see their own membership rows (user_id = auth.uid()).

DROP POLICY IF EXISTS "Users can view own workspace membership" ON public.workspace_members;
CREATE POLICY "Users can view own workspace membership"
  ON public.workspace_members
  FOR SELECT
  USING (user_id = auth.uid());
