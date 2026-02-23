-- Store pending email change so we can notify old email after user confirms at new address.
-- user_id = auth user; when they confirm, session has new email and we look up old_email by user_id.
CREATE TABLE IF NOT EXISTS public.email_change_pending (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  old_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT (NOW() AT TIME ZONE 'utc') NOT NULL
);

COMMENT ON TABLE public.email_change_pending IS 'Pending email change: after user confirms at new address we notify old_email then delete row';

-- RLS: user can only manage their own row
ALTER TABLE public.email_change_pending ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own pending email change" ON public.email_change_pending;
CREATE POLICY "Users can insert own pending email change"
  ON public.email_change_pending FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select own pending email change" ON public.email_change_pending;
CREATE POLICY "Users can select own pending email change"
  ON public.email_change_pending FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending email change" ON public.email_change_pending;
CREATE POLICY "Users can update own pending email change"
  ON public.email_change_pending FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pending email change" ON public.email_change_pending;
CREATE POLICY "Users can delete own pending email change"
  ON public.email_change_pending FOR DELETE
  USING (auth.uid() = user_id);

-- Service role / Edge Functions can read and delete by user_id (bypasses RLS).
