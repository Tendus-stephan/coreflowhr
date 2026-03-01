-- Company-assets RLS: use SECURITY DEFINER helper so policy is not blocked by workspace_members RLS.
-- Path format: {workspace_id}/logo.{ext}. First segment must be UUID; access allowed only if
-- current user is Admin or Recruiter for that workspace.

DROP POLICY IF EXISTS "Workspace members can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can delete company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read company assets" ON storage.objects;

-- First path segment must look like a UUID to avoid cast errors
CREATE POLICY "Workspace members can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND split_part(trim(both '/' from name), '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.is_workspace_admin_or_recruiter((split_part(trim(both '/' from name), '/', 1))::uuid)
);

CREATE POLICY "Workspace members can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND split_part(trim(both '/' from name), '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.is_workspace_admin_or_recruiter((split_part(trim(both '/' from name), '/', 1))::uuid)
);

CREATE POLICY "Workspace members can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND split_part(trim(both '/' from name), '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  AND public.is_workspace_admin_or_recruiter((split_part(trim(both '/' from name), '/', 1))::uuid)
);

CREATE POLICY "Authenticated can read company assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'company-assets');
