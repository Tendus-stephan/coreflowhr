-- Migration: Add onboarding completion tracking
-- Run this in Supabase SQL Editor

-- Add onboarding fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed 
ON profiles(onboarding_completed) 
WHERE onboarding_completed = false;

-- Note: Existing users will have onboarding_completed = false by default
-- They will be prompted to complete onboarding on next login


