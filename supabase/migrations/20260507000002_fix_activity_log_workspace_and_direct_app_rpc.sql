-- 1. Backfill workspace_id on activity_log rows that are null.
--    Joins through workspace_members to find the right workspace for each user.
UPDATE public.activity_log al
SET workspace_id = wm.workspace_id
FROM (
    SELECT DISTINCT ON (user_id) user_id, workspace_id
    FROM public.workspace_members
    ORDER BY user_id, role DESC  -- prefer Admin rows first
) wm
WHERE al.user_id = wm.user_id
  AND al.workspace_id IS NULL;

-- 2. SECURITY DEFINER RPC so the anon apply form can write an activity_log
--    entry attributed to the job owner (recruiter) when a candidate applies.
CREATE OR REPLACE FUNCTION public.log_direct_application(
    p_user_id      UUID,
    p_user_name    TEXT,
    p_candidate    TEXT,
    p_job_title    TEXT,
    p_workspace_id UUID
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.activity_log (user_id, user_name, action, target, workspace_id)
    VALUES (
        p_user_id,
        p_user_name,
        'received application for',
        p_candidate || ' → ' || p_job_title,
        p_workspace_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.log_direct_application(UUID, TEXT, TEXT, TEXT, UUID)
    TO anon, authenticated;
