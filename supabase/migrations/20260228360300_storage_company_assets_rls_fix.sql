-- Fix company-assets RLS: use split_part for path segment (more reliable than storage.foldername in WITH CHECK).
-- Ensures workspace Admin/Recruiter can INSERT/UPDATE/DELETE objects under their workspace_id folder.

DROP POLICY IF EXISTS "Workspace members can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Workspace members can delete company assets" ON storage.objects;

CREATE POLICY "Workspace members can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND split_part(name, '/', 1) IN (
    SELECT wm.workspace_id::text FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.role IN ('Admin', 'Recruiter')
  )
);

CREATE POLICY "Workspace members can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND split_part(name, '/', 1) IN (
    SELECT wm.workspace_id::text FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.role IN ('Admin', 'Recruiter')
  )
);

CREATE POLICY "Workspace members can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND split_part(name, '/', 1) IN (
    SELECT wm.workspace_id::text FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.role IN ('Admin', 'Recruiter')
  )
);

CREATE POLICY "Authenticated can read company assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'company-assets');
