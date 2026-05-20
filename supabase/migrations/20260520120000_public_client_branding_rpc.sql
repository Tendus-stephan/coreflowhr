-- Allow the public job application page to read a client's branding (name + logo only)
-- without auth, via a SECURITY DEFINER function that bypasses RLS on clients.
-- Only name and logo_url are exposed — all other client fields remain private.

CREATE OR REPLACE FUNCTION public.get_client_branding(p_client_id UUID)
RETURNS TABLE(name TEXT, logo_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT c.name, c.logo_url
    FROM clients c
    WHERE c.id = p_client_id;
END;
$$;

-- Grant execute to anon so the public job application page can call it
GRANT EXECUTE ON FUNCTION public.get_client_branding(UUID) TO anon;
