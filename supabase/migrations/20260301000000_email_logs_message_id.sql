-- Store RFC Message-ID for each sent email so replies can set In-Reply-To and References (proper threading).
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS message_id TEXT;

COMMENT ON COLUMN public.email_logs.message_id IS 'RFC 5322 Message-ID of the sent email (e.g. <uuid@domain>) for In-Reply-To/References threading';

CREATE INDEX IF NOT EXISTS idx_email_logs_message_id ON public.email_logs(message_id) WHERE message_id IS NOT NULL;
