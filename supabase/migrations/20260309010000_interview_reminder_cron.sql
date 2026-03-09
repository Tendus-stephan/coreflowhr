-- Schedule interview reminder Slack notifications every 10 minutes via pg_cron + pg_net.
-- The send-interview-reminders Edge Function is deployed with --no-verify-jwt so no auth header needed.
-- pg_cron and pg_net extensions must be enabled: Dashboard → Database → Extensions.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove if already scheduled (idempotent)
SELECT cron.unschedule('send-interview-reminders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-interview-reminders'
);

SELECT cron.schedule(
  'send-interview-reminders',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://lpjyxpxkagctaibmqcoi.supabase.co/functions/v1/send-interview-reminders',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
