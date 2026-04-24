-- Change email uniqueness from workspace-wide to per-job.
--
-- WHY: The workspace-wide constraint caused bulk CV imports to silently update
-- existing candidates in OTHER jobs instead of creating new candidates in the
-- target job (e.g. the pool).  The same person can legitimately be a candidate
-- for multiple jobs; cross-job dedup is surfaced in the UI via "Also in job X"
-- (alsoInJobTitles).
--
-- WHAT CHANGES:
--  - Drop candidates_workspace_email_unique  (workspace_id, lower(email))
--  - Create candidates_job_email_unique      (job_id,       lower(email))
--
-- This is a RELAXING change (per-job is less strict than per-workspace), so no
-- existing rows are at risk of violating the new constraint.

DROP INDEX IF EXISTS candidates_workspace_email_unique;

CREATE UNIQUE INDEX IF NOT EXISTS candidates_job_email_unique
    ON candidates (job_id, lower(email))
    WHERE email IS NOT NULL;
