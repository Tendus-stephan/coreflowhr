-- Migration 5: Clean workspace columns, add new plan fields
-- Drop old credit columns (may not exist — IF EXISTS handles gracefully)
ALTER TABLE workspaces
  DROP COLUMN IF EXISTS sourcing_credits_total,
  DROP COLUMN IF EXISTS sourcing_credits_used,
  DROP COLUMN IF EXISTS sourcing_credits_reset_at,
  DROP COLUMN IF EXISTS esignature_credits_total,
  DROP COLUMN IF EXISTS esignature_credits_used,
  DROP COLUMN IF EXISTS cv_parse_credits_total,
  DROP COLUMN IF EXISTS cv_parse_credits_used,
  DROP COLUMN IF EXISTS max_active_jobs,
  DROP COLUMN IF EXISTS max_team_members,
  DROP COLUMN IF EXISTS grace_credits_given;

-- Add new clean plan fields
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_free_access BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS free_access_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS esignature_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS esignature_limit INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS cv_parse_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cv_parse_limit INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS founding_customer BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;

-- Allow workspace owners to update their own workspace
CREATE POLICY "Workspace owners can update their workspace"
  ON workspaces FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
