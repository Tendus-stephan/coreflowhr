-- Storage bucket for company assets (e.g. workspace logos). Paths: {workspace_id}/logo.{ext}
-- Public read so offer PDF can embed logo URL; write restricted to authenticated with RLS.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Only workspace members (admins/recruiters) can upload/update/delete in their workspace folder
-- Policy: path must start with workspace_id; user must be member of that workspace
DROP POLICY IF EXISTS "Workspace members can upload company assets" ON storage.objects;
CREATE POLICY "Workspace members can upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT wm.workspace_id::text FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.role IN ('Admin', 'Recruiter')
  )
);

DROP POLICY IF EXISTS "Workspace members can update company assets" ON storage.objects;
CREATE POLICY "Workspace members can update company assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT wm.workspace_id::text FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.role IN ('Admin', 'Recruiter')
  )
);

DROP POLICY IF EXISTS "Workspace members can delete company assets" ON storage.objects;
CREATE POLICY "Workspace members can delete company assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT wm.workspace_id::text FROM public.workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.role IN ('Admin', 'Recruiter')
  )
);

-- Public read (bucket is public) - no policy needed for SELECT when bucket is public
