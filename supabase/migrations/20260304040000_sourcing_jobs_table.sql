-- Migration 4: Sourcing jobs tracking table
CREATE TABLE IF NOT EXISTS sourcing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  trigger_type TEXT DEFAULT 'auto',
  status TEXT DEFAULT 'pending',
  candidates_requested INTEGER DEFAULT 20,
  candidates_found INTEGER DEFAULT 0,
  candidates_created INTEGER DEFAULT 0,
  pdl_offset_start INTEGER DEFAULT 0,
  pdl_offset_end INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sourcing_jobs_job_id_idx ON sourcing_jobs(job_id);
CREATE INDEX IF NOT EXISTS sourcing_jobs_workspace_id_idx ON sourcing_jobs(workspace_id);

ALTER TABLE sourcing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view sourcing jobs" ON sourcing_jobs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
