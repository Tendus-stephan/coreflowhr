-- Migration to add device fingerprint for same-device session detection
-- Run this in Supabase SQL Editor
-- This migration creates the user_sessions table if it doesn't exist, or adds the device_fingerprint column if it does

-- First, create the user_sessions table if it doesn't exist (includes device_fingerprint from the start)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')) DEFAULT 'desktop',
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  location TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  is_current BOOLEAN DEFAULT false,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (TIMEZONE('utc', NOW()) + INTERVAL '30 days')
);

-- Add device_fingerprint column if table exists but column doesn't
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_sessions' AND column_name = 'device_fingerprint'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN device_fingerprint TEXT;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_current ON user_sessions(user_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_fingerprint 
ON user_sessions(user_id, device_fingerprint) 
WHERE device_fingerprint IS NOT NULL;

-- Enable RLS if not already enabled
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Users can view own sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_sessions' AND policyname = 'Users can view own sessions'
  ) THEN
    CREATE POLICY "Users can view own sessions" ON user_sessions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Users can insert own sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_sessions' AND policyname = 'Users can insert own sessions'
  ) THEN
    CREATE POLICY "Users can insert own sessions" ON user_sessions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Users can update own sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_sessions' AND policyname = 'Users can update own sessions'
  ) THEN
    CREATE POLICY "Users can update own sessions" ON user_sessions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- Users can delete own sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_sessions' AND policyname = 'Users can delete own sessions'
  ) THEN
    CREATE POLICY "Users can delete own sessions" ON user_sessions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Update existing sessions to have a device fingerprint based on browser + os + user_agent
-- This is a one-time migration for existing data
UPDATE user_sessions
SET device_fingerprint = MD5(COALESCE(browser, '') || '|' || COALESCE(os, '') || '|' || COALESCE(user_agent, ''))
WHERE device_fingerprint IS NULL;

-- Add comment
COMMENT ON COLUMN user_sessions.device_fingerprint IS 'Hash of browser + OS + user agent to identify same device/browser sessions';

