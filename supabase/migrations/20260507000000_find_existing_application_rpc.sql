-- SECURITY DEFINER RPC so the public (anon) apply form can check for
-- duplicate applications without needing direct SELECT access to the
-- candidates table (which is blocked by workspace-scoped RLS).
CREATE OR REPLACE FUNCTION public.find_existing_application(
    p_job_id  UUID,
    p_email   TEXT
)
RETURNS TABLE (id UUID, name TEXT, applied_date TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, name, applied_date
    FROM candidates
    WHERE job_id = p_job_id
      AND lower(email) = lower(p_email)
    LIMIT 1;
$$;

-- Allow anon and authenticated callers (apply page uses anon key)
GRANT EXECUTE ON FUNCTION public.find_existing_application(UUID, TEXT)
    TO anon, authenticated;
