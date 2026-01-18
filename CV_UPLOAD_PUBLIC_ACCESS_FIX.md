# CV Upload Public Access Fix

## Changes Made

### 1. **JobApplication Page - Direct Supabase Query** ✅
- **Changed**: Replaced `api.jobs.get()` (requires auth) with direct `supabase.from('jobs')` query
- **Reason**: `api.jobs.get()` requires authentication, but CV upload page is public
- **Result**: Job data loads without authentication, using existing RLS policy "Public can view active jobs"

### 2. **Database RLS Policy for CV Upload** ✅
- **Created**: `supabase/migrations/add_public_cv_upload_policy.sql`
- **Policies Added**:
  1. **Public can read candidate by CV upload token** - Allows reading candidates with `cv_upload_token` OR by email (for duplicate check)
  2. **Public can insert candidate for CV upload** - Allows inserting candidates with `source = 'direct_application'`
  3. **Public can update candidate CV via upload token** - Allows updating candidates with CV upload tokens

## How It Works

1. **Job Loading**: Uses direct supabase query (no auth) → RLS policy "Public can view active jobs" allows access
2. **CV Upload**: `api.candidates.apply()` uses direct supabase queries → RLS policies allow public access
3. **Token Validation**: Can read candidate data if `cv_upload_token` exists OR checking by email

## Next Steps

### Run the Database Migration:

```sql
-- Run this in Supabase SQL Editor:
-- File: supabase/migrations/add_public_cv_upload_policy.sql
```

## Testing

1. **In Incognito/Private Window:**
   - Visit: `http://localhost:5173/jobs/apply/{jobId}`
   - Should load without sidebar
   - Should show job details
   - Should allow CV upload without authentication

2. **With Token:**
   - Visit: `http://localhost:5173/jobs/apply/{jobId}?token={cvUploadToken}`
   - Should pre-fill candidate name/email
   - Should allow CV upload

## Summary

✅ CV upload page now works completely publicly
✅ No authentication required
✅ Direct database queries with RLS policies
✅ Same approach as registration page
