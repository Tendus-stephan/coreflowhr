-- Two-way email: direction (outbound/inbound) and read flag for email_logs

-- Add direction: 'outbound' | 'inbound'
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound'
  CHECK (direction IN ('outbound', 'inbound'));

-- Add read flag for inbound unread indicator
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS read BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing rows (all existing logs are outbound)
UPDATE public.email_logs
SET direction = 'outbound', read = false
WHERE direction IS NULL OR read IS NULL;

-- Optional: table for inbound replies that couldn't be matched to a candidate
CREATE TABLE IF NOT EXISTS public.unmatched_inbound_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email TEXT NOT NULL,
  to_email TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.email_logs.direction IS 'outbound = sent by recruiter, inbound = reply from candidate';
COMMENT ON COLUMN public.email_logs.read IS 'For inbound: true once recruiter has viewed the reply';
