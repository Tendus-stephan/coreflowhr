-- Comprehensive fix for email_logs table schema
-- Run this in Supabase Dashboard → SQL Editor if email history is not showing up
-- All statements use IF NOT EXISTS / IF EXISTS so it is safe to run multiple times.

-- 1. Add direction column (outbound / inbound)
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound';
UPDATE public.email_logs SET direction = 'outbound' WHERE direction IS NULL;
ALTER TABLE public.email_logs ALTER COLUMN direction SET NOT NULL;
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_direction_check;
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_direction_check
  CHECK (direction IN ('outbound', 'inbound'));

-- 2. Add read flag
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
UPDATE public.email_logs SET read = false WHERE read IS NULL;
ALTER TABLE public.email_logs ALTER COLUMN read SET NOT NULL;

-- 3. Add RFC Message-ID for threading
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS message_id TEXT;
CREATE INDEX IF NOT EXISTS idx_email_logs_message_id
  ON public.email_logs(message_id) WHERE message_id IS NOT NULL;

-- 4. Add reply_to_id (FK to parent email in thread)
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL;

-- 5. Add thread_id (groups emails in same conversation)
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS thread_id UUID;
CREATE INDEX IF NOT EXISTS idx_email_logs_thread_id
  ON public.email_logs(thread_id) WHERE thread_id IS NOT NULL;

-- 6. Realtime publication (so EmailHistory live-updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'email_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;
  END IF;
END $$;

-- 7. RLS: drop old policy (joined via jobs.workspace_id — fails when job has no workspace)
--    and replace with policy that goes via candidates.workspace_id directly.
DROP POLICY IF EXISTS "Users can view email logs for visible candidates" ON public.email_logs;
CREATE POLICY "Users can view email logs for visible candidates" ON public.email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = email_logs.candidate_id
        AND (
          c.user_id = auth.uid()
          OR (c.workspace_id IS NOT NULL AND public.is_workspace_member(c.workspace_id))
          OR EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = c.job_id
              AND (
                j.hiring_manager_id = auth.uid()
                OR EXISTS (
                  SELECT 1 FROM public.job_assignments ja
                  WHERE ja.job_id = j.id AND ja.user_id = auth.uid()
                )
              )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can update read flag for visible candidate emails" ON public.email_logs;
CREATE POLICY "Users can update read flag for visible candidate emails" ON public.email_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = email_logs.candidate_id
        AND (
          c.user_id = auth.uid()
          OR (c.workspace_id IS NOT NULL AND public.is_workspace_member(c.workspace_id))
          OR EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = c.job_id
              AND (
                j.hiring_manager_id = auth.uid()
                OR EXISTS (
                  SELECT 1 FROM public.job_assignments ja
                  WHERE ja.job_id = j.id AND ja.user_id = auth.uid()
                )
              )
          )
        )
    )
  )
  WITH CHECK (true);
