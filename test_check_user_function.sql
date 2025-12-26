-- Test the check_user_exists_and_verified function
-- Run this to verify the function works correctly

-- Test 1: Check if function exists
SELECT 
  routine_name, 
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'check_user_exists_and_verified';

-- Test 2: Test the function with a specific email (replace with actual email)
SELECT * FROM public.check_user_exists_and_verified('tendusstephan@gmail.com');

-- Test 3: Check all users and their verification status
SELECT 
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '❌ Not Confirmed'
  END as status
FROM auth.users
ORDER BY created_at DESC;

