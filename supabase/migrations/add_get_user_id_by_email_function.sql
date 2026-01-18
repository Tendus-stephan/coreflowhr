-- Function to get user ID by email (for admin account lookup)
-- This allows the scraper to find the admin user ID without exposing auth.users directly

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  RETURN user_uuid;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;


-- This allows the scraper to find the admin user ID without exposing auth.users directly

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  RETURN user_uuid;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;

