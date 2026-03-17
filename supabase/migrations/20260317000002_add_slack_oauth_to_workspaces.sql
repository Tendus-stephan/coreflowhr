-- Add Slack OAuth columns to workspaces.
-- Previously only slack_webhook_url was stored (manually pasted by admin).
-- Now we store the full OAuth bot token + channel info for proper API-based integration.

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS slack_bot_token TEXT,
  ADD COLUMN IF NOT EXISTS slack_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_channel_name TEXT,
  ADD COLUMN IF NOT EXISTS slack_team_name TEXT,
  ADD COLUMN IF NOT EXISTS slack_team_id TEXT;
