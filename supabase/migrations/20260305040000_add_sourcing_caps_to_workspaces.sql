-- Migration: Add provider and cap fields to workspaces table
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS sourcing_provider TEXT DEFAULT 'pdl',
  ADD COLUMN IF NOT EXISTS sourcing_credits_monthly INTEGER DEFAULT 200,
  ADD COLUMN IF NOT EXISTS sourcing_credits_used_this_month INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sourcing_credits_reset_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS sourcing_notifications_sent JSONB DEFAULT '{}';
