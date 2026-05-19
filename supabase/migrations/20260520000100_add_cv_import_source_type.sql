-- Add 'cv_import' to candidates source check constraint
-- Was added to prod directly without a migration.

ALTER TABLE public.candidates
DROP CONSTRAINT IF EXISTS candidates_source_check;

ALTER TABLE public.candidates
ADD CONSTRAINT candidates_source_check
CHECK (source IN ('ai_sourced', 'direct_application', 'email_application', 'referral', 'scraped', 'cv_import'));
