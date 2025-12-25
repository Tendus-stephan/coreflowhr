# Quick Fix: Avatar Storage Error

## The Error
```
Error: Avatar storage not configured. Please contact support.
```

## What This Means
The Supabase Storage bucket named `avatars` doesn't exist yet. You need to create it.

## Quick Fix (2 Options)

### Option 1: Using SQL (Fastest - Recommended)

1. **Go to Supabase Dashboard** → **SQL Editor**
2. **Click "New query"**
3. **Copy and paste** the entire contents of `CREATE_AVATAR_BUCKET.sql`
4. **Click "Run"** (or press Ctrl+Enter)
5. **Done!** ✅

### Option 2: Using Dashboard (Visual)

1. **Go to Supabase Dashboard** → **Storage**
2. **Click "New bucket"**
3. **Fill in:**
   - **Name:** `avatars`
   - **Public bucket:** ✅ **Check this** (important!)
   - **File size limit:** `5242880` (5MB)
   - **Allowed MIME types:** Leave empty OR enter: `image/jpeg,image/png,image/gif,image/webp`
4. **Click "Create bucket"**
5. **Go to Storage** → **Policies** → **avatars**
6. **Create these 4 policies:**

   **Policy 1: Upload**
   - Name: "Users can upload own avatars"
   - Operation: INSERT
   - Policy: `(bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])`

   **Policy 2: Update**
   - Name: "Users can update own avatars"
   - Operation: UPDATE
   - Policy: `(bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])`

   **Policy 3: Delete**
   - Name: "Users can delete own avatars"
   - Operation: DELETE
   - Policy: `(bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])`

   **Policy 4: Read (Public)**
   - Name: "Public can read avatars"
   - Operation: SELECT
   - Target roles: `public`
   - Policy: `bucket_id = 'avatars'::text`

## Verify It Works

After creating the bucket:

1. **Go to your app** → **Settings** page
2. **Click "Change Avatar"**
3. **Select an image**
4. **Should upload successfully!** ✅

## Troubleshooting

### "Bucket already exists"
- That's fine! The bucket is already created.
- Just make sure the policies are set up (use Option 1 SQL to create policies)

### "Permission denied"
- Make sure you created all 4 policies
- Check that the bucket is set to **public**

### Still getting errors?
- Check Supabase Dashboard → Storage → avatars → Make sure it exists
- Check Storage → Policies → Make sure all 4 policies exist
- Try refreshing your app

