-- Migration: Add 'scraped' source type to candidates table
-- Run this in Supabase SQL Editor

-- Drop existing constraint if it exists
ALTER TABLE candidates 
DROP CONSTRAINT IF EXISTS candidates_source_check;

-- Add new constraint with 'scraped' source type
ALTER TABLE candidates 
ADD CONSTRAINT candidates_source_check 
CHECK (source IN ('ai_sourced', 'direct_application', 'email_application', 'referral', 'scraped'));

-- Update types.ts source type to include 'scraped'
-- This is handled in the TypeScript code, but the database constraint is now in place


