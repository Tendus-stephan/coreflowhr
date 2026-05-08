create or replace function get_user_emails_by_ids(p_user_ids uuid[])
returns table(id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select id, email::text from auth.users where id = any(p_user_ids);
$$;
