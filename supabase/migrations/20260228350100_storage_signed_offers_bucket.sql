-- Storage bucket for signed offer PDFs (eSignature). Private; read by authenticated (API only returns signed URL when user can see offer).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signed-offers',
  'signed-offers',
  false,
  10485760,  -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can read signed offers" ON storage.objects;
CREATE POLICY "Authenticated can read signed offers"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signed-offers');

DROP POLICY IF EXISTS "Service role can manage signed offers" ON storage.objects;
CREATE POLICY "Service role can manage signed offers"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'signed-offers')
WITH CHECK (bucket_id = 'signed-offers');
