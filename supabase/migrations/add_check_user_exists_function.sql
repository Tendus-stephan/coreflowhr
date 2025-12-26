-- Function to check if a user exists, if their email is verified, and if MFA is enabled
-- This can be called from the client to check user status before signup
CREATE OR REPLACE FUNCTION public.check_user_exists_and_verified(user_email TEXT)
RETURNS TABLE(
  user_exists BOOLEAN,
  is_verified BOOLEAN,
  has_mfa BOOLEAN,
  user_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_email_confirmed_at TIMESTAMPTZ;
  v_has_mfa BOOLEAN := FALSE;
BEGIN
  -- Check if user exists in auth.users
  SELECT id, email_confirmed_at INTO v_user_id, v_email_confirmed_at
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  -- If user exists, check if they have MFA enabled (verified MFA factors)
  IF v_user_id IS NOT NULL THEN
    -- Check if user has any verified MFA factors
    SELECT EXISTS(
      SELECT 1 
      FROM auth.mfa_factors mfa
      WHERE mfa.user_id = v_user_id 
      AND mfa.status = 'verified'
    ) INTO v_has_mfa;
    
    RETURN QUERY SELECT 
      TRUE as user_exists,
      (v_email_confirmed_at IS NOT NULL) as is_verified,
      v_has_mfa as has_mfa,
      v_user_id as user_id;
  ELSE
    RETURN QUERY SELECT 
      FALSE as user_exists,
      FALSE as is_verified,
      FALSE as has_mfa,
      NULL::UUID as user_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (or anon if you want to allow checking before signup)
GRANT EXECUTE ON FUNCTION public.check_user_exists_and_verified(TEXT) TO anon, authenticated;

