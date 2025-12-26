-- Create Email Assets Storage Bucket in Supabase for Email Logos
-- Run this in Supabase SQL Editor

-- Step 1: Create the storage bucket for email assets (logo, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-assets',
  'email-assets',
  true,  -- MUST be public so email clients can access images
  1048576,  -- 1MB file size limit (sufficient for logos)
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']  -- Allowed image types
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create policy to allow public read access (CRITICAL for email clients)
CREATE POLICY "Public can read email assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'email-assets');

-- Step 3: Create policy to allow authenticated users to upload email assets
CREATE POLICY "Authenticated users can upload email assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'email-assets');

-- Step 4: Create policy to allow authenticated users to update email assets
CREATE POLICY "Authenticated users can update email assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'email-assets')
WITH CHECK (bucket_id = 'email-assets');

-- Step 5: Create policy to allow authenticated users to delete email assets
CREATE POLICY "Authenticated users can delete email assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'email-assets');

-- Verify bucket was created
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'email-assets';

