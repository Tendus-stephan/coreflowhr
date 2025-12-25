-- Fix: Add missing INSERT and UPDATE policies for user_sessions
-- Run this in Supabase SQL Editor to fix the 403 Forbidden error

-- Add INSERT policy for user_sessions
CREATE POLICY "Users can insert own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy for user_sessions
CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_sessions'
ORDER BY policyname;





