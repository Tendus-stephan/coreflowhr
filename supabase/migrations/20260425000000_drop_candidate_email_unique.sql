-- Remove per-job email uniqueness constraint on candidates.
-- The same email appearing twice in one job is rare and not worth blocking saves over.
DROP INDEX IF EXISTS candidates_job_email_unique;
DROP INDEX IF EXISTS idx_candidates_job_email_unique;
