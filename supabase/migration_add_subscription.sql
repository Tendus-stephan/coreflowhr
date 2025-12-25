-- Migration: Add subscription fields to user_settings table
-- Run this in Supabase SQL Editor if you already ran the main schema

ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_stripe_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update default billing plan name to 'Free' for new users
ALTER TABLE user_settings 
ALTER COLUMN billing_plan_name SET DEFAULT 'Free';


