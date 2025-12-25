-- Migration: Create security settings for existing users
-- Run this after running migration_security_tables.sql
-- This ensures all existing users have a row in user_security_settings

-- Insert security settings for any users that don't have one yet
INSERT INTO public.user_security_settings (user_id, two_factor_enabled, password_changed_at)
SELECT 
    id as user_id,
    false as two_factor_enabled,
    NOW() as password_changed_at
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_security_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Verify the insert
SELECT COUNT(*) as total_users, 
       (SELECT COUNT(*) FROM public.user_security_settings) as users_with_settings
FROM auth.users;













