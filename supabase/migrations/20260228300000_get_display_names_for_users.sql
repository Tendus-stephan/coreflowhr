-- Return display names for given user IDs: profile name if set, else email local part, never "User".
-- SECURITY DEFINER so we can read auth.users; used by getWorkspaceWithMembers for Team & Access.

CREATE OR REPLACE FUNCTION public.get_display_names_for_users(p_user_ids uuid[])
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_object_agg(
      u.id::text,
      COALESCE(
        CASE WHEN p.name IS NOT NULL AND btrim(p.name) <> '' AND lower(btrim(p.name)) <> 'user'
             THEN btrim(p.name) ELSE NULL END,
        CASE WHEN u.email IS NOT NULL AND btrim(u.email) <> '' THEN split_part(u.email, '@', 1) ELSE NULL END,
        'Member'
      )
    ),
    '{}'::jsonb
  )
  FROM unnest(p_user_ids) AS uid
  JOIN auth.users u ON u.id = uid
  LEFT JOIN public.profiles p ON p.id = u.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_display_names_for_users(uuid[]) TO authenticated;
