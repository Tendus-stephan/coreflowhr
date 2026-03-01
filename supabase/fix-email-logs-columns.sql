-- Fix: Add direction and read to email_logs (fix "Could not find the 'direction' column" error)
-- Run this in Supabase Dashboard → SQL Editor

-- Add direction column if missing
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound';
UPDATE public.email_logs SET direction = 'outbound' WHERE direction IS NULL;
ALTER TABLE public.email_logs ALTER COLUMN direction SET DEFAULT 'outbound';
ALTER TABLE public.email_logs ALTER COLUMN direction SET NOT NULL;

-- Add read column if missing
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
UPDATE public.email_logs SET read = false WHERE read IS NULL;
ALTER TABLE public.email_logs ALTER COLUMN read SET DEFAULT false;
ALTER TABLE public.email_logs ALTER COLUMN read SET NOT NULL;

-- Optional: restrict direction values
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_direction_check;
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_direction_check
  CHECK (direction IN ('outbound', 'inbound'));
