-- Add Slack webhook URL to workspaces for workspace-level Slack notifications.
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
