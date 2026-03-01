-- Google Calendar sync: store event id and sync status on interviews
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS calendar_sync_status TEXT CHECK (calendar_sync_status IN ('synced', 'failed', 'pending', 'not_connected')),
  ADD COLUMN IF NOT EXISTS calendar_sync_error TEXT;

COMMENT ON COLUMN public.interviews.google_event_id IS 'Google Calendar event ID when interview is synced to calendar';
COMMENT ON COLUMN public.interviews.calendar_sync_status IS 'synced | failed | pending | not_connected';
COMMENT ON COLUMN public.interviews.calendar_sync_error IS 'Error message when calendar sync fails';
