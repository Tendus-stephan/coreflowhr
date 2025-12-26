-- Query to check all users and their email confirmation status
-- Run this in Supabase SQL Editor

SELECT 
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '❌ Not Confirmed'
  END as confirmation_status,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Verified User'
    ELSE 'Waiting for Verification'
  END as user_status
FROM auth.users
ORDER BY created_at DESC;

-- To check a specific user:
-- SELECT 
--   email,
--   email_confirmed_at,
--   CASE 
--     WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
--     ELSE '❌ Not Confirmed'
--   END as confirmation_status
-- FROM auth.users
-- WHERE email = 'tendusstephan@gmail.com';

