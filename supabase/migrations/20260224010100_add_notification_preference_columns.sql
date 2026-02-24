-- Notification email preferences on user_settings (used by API and Edge Functions)
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS interview_schedule_updates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS offer_updates BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.user_settings.email_notifications IS 'Send emails for system updates (e.g. scraping complete)';
COMMENT ON COLUMN public.user_settings.interview_schedule_updates IS 'Send email when an interview is coming up (reminder)';
COMMENT ON COLUMN public.user_settings.offer_updates IS 'Send emails for offer-related updates';
