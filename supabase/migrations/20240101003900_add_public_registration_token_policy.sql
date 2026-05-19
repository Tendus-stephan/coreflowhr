-- Allow public/anonymous access to candidates table for registration token validation
-- This allows candidates without accounts to register their email via token
-- IMPORTANT: This must be run after the registration_token columns are added

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read candidate by registration token" ON candidates;
DROP POLICY IF EXISTS "Public can update candidate email via registration token" ON candidates;

-- Create policy: Allow anonymous users to read candidate data if they have a registration token
-- Token validation happens in application code, RLS just needs to allow the read
CREATE POLICY "Public can read candidate by registration token"
ON candidates FOR SELECT
TO public
USING (
  -- Allow read if candidate has a registration token (token validation happens in app code)
  registration_token IS NOT NULL
);

-- Allow public to update candidate email during registration (via token validation)
-- Token matching and expiration are validated in application code before this update
CREATE POLICY "Public can update candidate email via registration token"
ON candidates FOR UPDATE
TO public
USING (
  -- Allow update if registration_token exists and is not yet used
  -- Token matching is validated in application code
  registration_token IS NOT NULL
  AND registration_token_used = false
)
WITH CHECK (
  -- After update, token will be marked as used, but we allow the update
  -- Can update: email, registration_token_used, stage
  registration_token IS NOT NULL
);
