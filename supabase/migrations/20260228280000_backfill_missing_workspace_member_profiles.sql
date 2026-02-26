-- Ensure every workspace member has a profile name so Team & Access never shows generic "User".
-- 1) Create missing profiles for workspace_members by pulling email from auth.users.
-- 2) For any existing profile with blank name, fill it from the email local-part.

-- 1) Insert profiles for members that don't have one yet
INSERT INTO public.profiles (id, name, email_notifications)
SELECT
  wm.user_id,
  split_part(u.email, '@', 1) AS name,
  true
FROM public.workspace_members wm
JOIN auth.users u ON u.id = wm.user_id
LEFT JOIN public.profiles p ON p.id = wm.user_id
WHERE p.id IS NULL
  AND u.email IS NOT NULL
  AND btrim(u.email) <> '';

-- 2) Backfill blank profile names from email for any remaining rows
UPDATE public.profiles p
SET name = split_part(u.email, '@', 1)
FROM auth.users u
WHERE p.id = u.id
  AND (p.name IS NULL OR btrim(p.name) = '')
  AND u.email IS NOT NULL
  AND btrim(u.email) <> '';

