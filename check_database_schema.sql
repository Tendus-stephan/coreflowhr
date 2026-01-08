-- Quick check to verify database schema supports test mode
-- Run this in Supabase SQL Editor before testing

-- Check if is_test column exists in jobs table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND column_name = 'is_test';

-- If the query above returns no results, run this to add the column:
-- ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Verify is_test column exists in candidates table (should already exist)
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'candidates' 
AND column_name = 'is_test';

-- Check existing workflows for all stages
SELECT 
    trigger_stage,
    name,
    enabled,
    email_template_id
FROM email_workflows
WHERE user_id = auth.uid()
ORDER BY trigger_stage;

-- Check email templates exist for all stages
SELECT 
    type,
    title,
    subject
FROM email_templates
WHERE user_id = auth.uid()
ORDER BY type;




