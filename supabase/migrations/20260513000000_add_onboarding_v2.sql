-- Track which wizard steps were done/skipped on the workspace record
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS setup_wizard_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS setup_steps JSONB NOT NULL DEFAULT '{}'::jsonb;
-- e.g. {"workspace_name":"done","google":"skipped","invites":"done","client":"skipped","email":"skipped"}

-- Coach marks: per-user array of seen mark IDs
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS coach_marks_seen JSONB NOT NULL DEFAULT '[]'::jsonb;
