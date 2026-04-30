-- Enable RLS on unmatched_inbound_emails.
-- This table stores inbound replies that couldn't be matched to a candidate.
-- Only the service role (edge functions) writes to it — no authenticated user
-- policies are needed since service role bypasses RLS by default.
ALTER TABLE public.unmatched_inbound_emails ENABLE ROW LEVEL SECURITY;
