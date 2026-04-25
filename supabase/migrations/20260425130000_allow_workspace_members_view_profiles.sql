-- Allow workspace members to view each other's profiles (needed for avatars, names, etc.)
-- Previously only "Users can view own profile" existed, blocking getWorkspaceWithMembers()
-- from fetching other members' avatar_url.

CREATE POLICY "Workspace members can view each other's profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = profiles.id
    )
  );
