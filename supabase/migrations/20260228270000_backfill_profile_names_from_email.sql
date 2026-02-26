-- Backfill profile names so members never appear as generic "User" in Team & Access.
-- For any profile with a blank/NULL name, use the local-part of auth.users.email (before the '@').

UPDATE public.profiles p
SET name = split_part(u.email, '@', 1)
FROM auth.users u
WHERE p.id = u.id
  AND (p.name IS NULL OR btrim(p.name) = '')
  AND u.email IS NOT NULL
  AND btrim(u.email) <> '';

