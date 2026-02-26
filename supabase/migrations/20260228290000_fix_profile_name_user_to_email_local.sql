-- Some older profiles have the literal name 'User', which shows up in Team & Access.
-- Replace that placeholder with a better default: the local-part of the user's email.

UPDATE public.profiles p
SET name = split_part(u.email, '@', 1)
FROM auth.users u
WHERE p.id = u.id
  AND p.name IS NOT NULL
  AND lower(btrim(p.name)) = 'user'
  AND u.email IS NOT NULL
  AND btrim(u.email) <> '';

