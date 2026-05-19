-- last_seen_at: for inactivity nudge (update on dashboard/pipeline load)
-- weekly_digest_enabled: opt-in for weekly summary email
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS weekly_digest_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.user_settings.last_seen_at IS 'Last time user was seen (e.g. dashboard load) for inactivity nudge';
COMMENT ON COLUMN public.user_settings.weekly_digest_enabled IS 'Whether to send weekly digest email (e.g. Monday 9am)';
