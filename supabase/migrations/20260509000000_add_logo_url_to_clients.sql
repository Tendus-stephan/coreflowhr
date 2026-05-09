-- Add logo_url column to clients table for per-client branding
alter table public.clients add column if not exists logo_url text;
