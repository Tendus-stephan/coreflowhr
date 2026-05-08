alter table workspaces
  add column if not exists banner_color text default '#1e3a5f';
