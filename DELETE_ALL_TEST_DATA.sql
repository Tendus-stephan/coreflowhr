-- Script to delete all test data from CoreFlowHR
-- WARNING: This will permanently delete all test candidates, jobs, offers, interviews, and related data
-- Run this in Supabase SQL Editor
-- 
-- Test data is identified by:
--   - candidates.is_test = true
--   - jobs.is_test = true OR jobs.title LIKE '[TEST]%' (both methods supported)
--   - Related data (offers, interviews, email_logs, etc.) linked to test candidates/jobs

BEGIN;

-- Delete email logs for test candidates
DELETE FROM email_logs
WHERE candidate_id IN (
    SELECT id FROM candidates WHERE is_test = true
);

-- Delete workflow executions for test candidates
DELETE FROM workflow_executions
WHERE candidate_id IN (
    SELECT id FROM candidates WHERE is_test = true
);

-- Delete interviews for test candidates
DELETE FROM interviews
WHERE candidate_id IN (
    SELECT id FROM candidates WHERE is_test = true
);

-- Delete offers for test candidates
DELETE FROM offers
WHERE candidate_id IN (
    SELECT id FROM candidates WHERE is_test = true
);

-- Delete offers linked to test jobs (check both is_test column and [TEST] prefix)
DELETE FROM offers
WHERE job_id IN (
    SELECT id FROM jobs 
    WHERE (is_test = true OR title LIKE '[TEST]%')
);

-- Delete candidates (this will cascade delete related data if foreign keys are set up)
DELETE FROM candidates
WHERE is_test = true;

-- Delete jobs with [TEST] prefix or is_test flag (test mode jobs)
DELETE FROM jobs
WHERE is_test = true OR title LIKE '[TEST]%';

-- Delete activity logs related to test data
DELETE FROM activity_log
WHERE target IN (
    SELECT id::text FROM candidates WHERE is_test = true
    UNION
    SELECT id::text FROM jobs WHERE (is_test = true OR title LIKE '[TEST]%')
);

-- Delete notifications related to test candidates/jobs
-- Note: notifications table doesn't have candidate_id/job_id columns
-- Notifications are only linked by user_id, so we can't filter by test data
-- If you need to delete notifications, you may need to do it manually or add a migration to add candidate_id/job_id columns
-- DELETE FROM notifications WHERE ... (skipped - no foreign key columns in notifications table)

COMMIT;

-- Summary query to verify deletion (run after the script)
-- SELECT 
--     (SELECT COUNT(*) FROM candidates WHERE is_test = true) as test_candidates,
--     (SELECT COUNT(*) FROM jobs WHERE (is_test = true OR title LIKE '[TEST]%')) as test_jobs,
--     (SELECT COUNT(*) FROM offers WHERE candidate_id IN (SELECT id FROM candidates WHERE is_test = true)) as test_offers,
--     (SELECT COUNT(*) FROM interviews WHERE candidate_id IN (SELECT id FROM candidates WHERE is_test = true)) as test_interviews;

