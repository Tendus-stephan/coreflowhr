-- Add slug column to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill from name (title + 6-char id suffix to guarantee uniqueness)
UPDATE workspaces
  SET slug = LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(COALESCE(name, 'workspace'), '[^a-zA-Z0-9\s]', '', 'g'),
      '\s+', '-', 'g'
    )
  ) || '-' || LEFT(id::text, 6)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_slug_unique ON workspaces (slug);

-- Auto-fill slug on new workspace insert (handles DB-trigger-created workspaces)
CREATE OR REPLACE FUNCTION public.set_workspace_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(COALESCE(NEW.name, 'workspace'), '[^a-zA-Z0-9\s]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) || '-' || LEFT(NEW.id::text, 6);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspace_slug_trigger ON workspaces;
CREATE TRIGGER workspace_slug_trigger
  BEFORE INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_workspace_slug();

-- Add slug column to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill: title-slug + first 6 chars of job UUID (always unique)
UPDATE jobs
  SET slug = LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(COALESCE(title, 'job'), '[^a-zA-Z0-9\s]', '', 'g'),
      '\s+', '-', 'g'
    )
  ) || '-' || LEFT(id::text, 6)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_workspace_slug_unique ON jobs (workspace_id, slug);

-- RLS: allow public to read workspace slug for slug-based lookup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'workspaces' AND policyname = 'Public can read workspace slug'
  ) THEN
    CREATE POLICY "Public can read workspace slug"
      ON workspaces FOR SELECT
      USING (true);
  END IF;
END
$$;
