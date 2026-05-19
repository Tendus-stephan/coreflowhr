-- Simple migration to add device_fingerprint column to existing user_sessions table
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql/new

-- Add device_fingerprint column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_sessions' AND column_name = 'device_fingerprint'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN device_fingerprint TEXT;
    RAISE NOTICE 'Added device_fingerprint column';
  ELSE
    RAISE NOTICE 'device_fingerprint column already exists';
  END IF;
END $$;

-- Create index for device_fingerprint if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_fingerprint 
ON user_sessions(user_id, device_fingerprint) 
WHERE device_fingerprint IS NOT NULL;

-- Update existing sessions to have a device fingerprint based on browser + os + user_agent
-- This is a one-time migration for existing data
UPDATE user_sessions
SET device_fingerprint = MD5(COALESCE(browser, '') || '|' || COALESCE(os, '') || '|' || COALESCE(user_agent, ''))
WHERE device_fingerprint IS NULL;

-- Add comment
COMMENT ON COLUMN user_sessions.device_fingerprint IS 'Hash of browser + OS + user agent to identify same device/browser sessions';

