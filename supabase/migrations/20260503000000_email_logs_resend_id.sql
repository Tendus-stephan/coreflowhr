-- Store the Resend email ID so open/click webhook events can match back to the right log row.
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS resend_id TEXT;

COMMENT ON COLUMN public.email_logs.resend_id IS 'Resend email ID (e.g. re_xxxxx) returned by the Resend API — used to match open/click webhook events back to this row';

CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON public.email_logs(resend_id) WHERE resend_id IS NOT NULL;
