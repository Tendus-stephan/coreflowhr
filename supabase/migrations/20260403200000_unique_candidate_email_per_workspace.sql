-- Step 1: Remove duplicate candidates, keeping the most recently created record
-- per (workspace_id, normalised email). All other duplicates are deleted.
DELETE FROM candidates
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY workspace_id, lower(email)
                ORDER BY applied_date DESC, created_at DESC
            ) AS rn
        FROM candidates
        WHERE email IS NOT NULL
    ) ranked
    WHERE rn > 1
);

-- Step 2: Create a partial unique index so no two candidates in the same
-- workspace can share the same email (NULLs are excluded — uncontacted
-- candidates with no email are never deduplicated against each other).
CREATE UNIQUE INDEX IF NOT EXISTS candidates_workspace_email_unique
    ON candidates (workspace_id, lower(email))
    WHERE email IS NOT NULL;
