-- Add company_description column to workspaces table
-- Used by the public careers page (/careers/:workspaceSlug)
alter table workspaces
  add column if not exists company_description text;
