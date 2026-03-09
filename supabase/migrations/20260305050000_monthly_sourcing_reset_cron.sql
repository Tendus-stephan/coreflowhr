-- Monthly sourcing credit reset via pg_cron
-- Runs on the 1st of every month at midnight UTC.
-- pg_cron extension must be enabled in the Supabase Dashboard → Database → Extensions.

-- Enable the pg_cron extension (safe to run if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists (idempotent)
SELECT cron.unschedule('reset-monthly-sourcing-credits')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'reset-monthly-sourcing-credits'
);

-- Schedule reset on the 1st of every month at 00:00 UTC
SELECT cron.schedule(
  'reset-monthly-sourcing-credits',
  '0 0 1 * *',
  $$
  UPDATE workspaces
  SET
    sourcing_credits_used_this_month = 0,
    sourcing_credits_reset_at        = now(),
    sourcing_notifications_sent      = '{}'
  WHERE
    is_free_access = false
    AND plan_status = 'active';
  $$
);
