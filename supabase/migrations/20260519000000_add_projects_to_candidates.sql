-- Add projects column to candidates (was added to prod directly without a migration)
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb;
