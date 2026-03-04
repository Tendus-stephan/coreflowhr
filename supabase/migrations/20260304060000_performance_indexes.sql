-- Migration 6: Performance indexes
CREATE INDEX IF NOT EXISTS candidates_job_id_idx ON candidates(job_id);
CREATE INDEX IF NOT EXISTS candidates_workspace_id_idx ON candidates(workspace_id);
CREATE INDEX IF NOT EXISTS candidates_source_idx ON candidates(source);
CREATE INDEX IF NOT EXISTS candidates_ai_match_score_idx ON candidates(ai_match_score DESC);
CREATE INDEX IF NOT EXISTS jobs_workspace_id_idx ON jobs(workspace_id);
CREATE INDEX IF NOT EXISTS jobs_sourcing_status_idx ON jobs(sourcing_status);
CREATE INDEX IF NOT EXISTS idx_email_logs_candidate_id ON email_logs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_offers_workspace_id ON offers(job_id);
