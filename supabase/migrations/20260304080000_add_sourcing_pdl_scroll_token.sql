-- Add scroll_token column to jobs for PDL pagination
-- PDL removed the 'from' offset parameter and now uses scroll_token for pagination.
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS sourcing_pdl_scroll_token TEXT;
