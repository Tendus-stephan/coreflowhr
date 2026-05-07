-- Backfill workspace_id for candidates applied via the public apply form.
-- Previously the apply() function didn't set workspace_id, so direct_application
-- candidates had workspace_id = NULL and were invisible to the board (which scopes by workspace).
-- This copies workspace_id from the candidate's job onto any affected rows.

UPDATE public.candidates c
SET workspace_id = j.workspace_id
FROM public.jobs j
WHERE c.job_id = j.id
  AND c.workspace_id IS NULL
  AND j.workspace_id IS NOT NULL;
