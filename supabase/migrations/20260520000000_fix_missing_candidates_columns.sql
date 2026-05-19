-- Re-applies columns that were registered in schema_migrations but never executed
-- due to the duplicate 20260519000000 timestamp conflict.

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS cv_upload_token TEXT,
  ADD COLUMN IF NOT EXISTS cv_upload_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_candidates_cv_upload_token
  ON public.candidates(cv_upload_token)
  WHERE cv_upload_token IS NOT NULL;
