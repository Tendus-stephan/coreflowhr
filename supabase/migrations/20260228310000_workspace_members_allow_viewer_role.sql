-- Allow Viewer role on workspace_members (table was created with only Admin, Recruiter, HiringManager).
-- Without this, changing a member's role to Viewer violates workspace_members_role_check.

DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'workspace_members' AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS %I', cname);
  END LOOP;
END $$;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('Admin', 'Recruiter', 'HiringManager', 'Viewer'));
