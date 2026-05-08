-- Backfill slugs for workspaces that don't have one yet.
-- Derives slug from workspace name (lowercase, spaces → hyphens, special chars stripped).
-- Appends a short suffix if the slug already exists on another workspace.

do $$
declare
  r record;
  base_slug text;
  candidate_slug text;
  counter int;
begin
  for r in
    select id, name from workspaces where slug is null or slug = ''
  loop
    -- Build base slug from name
    base_slug := lower(r.name);
    base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    if base_slug = '' then
      base_slug := 'workspace';
    end if;

    -- Ensure uniqueness
    candidate_slug := base_slug;
    counter := 1;
    while exists (select 1 from workspaces where slug = candidate_slug and id != r.id) loop
      candidate_slug := base_slug || '-' || counter;
      counter := counter + 1;
    end loop;

    update workspaces set slug = candidate_slug where id = r.id;
  end loop;
end;
$$;
