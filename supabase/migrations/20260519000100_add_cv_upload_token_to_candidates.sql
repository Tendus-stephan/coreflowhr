-- Add cv_upload_token columns to candidates (were added to prod directly without a migration)
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS cv_upload_token TEXT,
  ADD COLUMN IF NOT EXISTS cv_upload_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_candidates_cv_upload_token
  ON public.candidates(cv_upload_token)
  WHERE cv_upload_token IS NOT NULL;
