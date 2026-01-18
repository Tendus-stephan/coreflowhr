# Registration Page Fix - Public Access

## Changes Made

### 1. **Removed from Layout Component** ✅
- Added `/candidates/register` to `isStandalonePage` check in `App.tsx`
- Registration page now renders without sidebar/navigation (like Job Application page)

### 2. **Database RLS Policy** ✅
- Created migration: `supabase/migrations/add_public_registration_token_policy.sql`
- Allows anonymous users to:
  - **Read** candidates with `registration_token IS NOT NULL`
  - **Update** candidates with valid registration tokens (email, registration_token_used, stage)

## How It Works

1. **Public Access**: Registration page is completely standalone (no sidebar, no user context)
2. **Token Validation**: Application code validates token matches URL parameter
3. **RLS Policy**: Database allows anonymous reads/updates for candidates with tokens
4. **Security**: Token matching and expiration checked in application code before database update

## Next Steps

### Run the Database Migration:

```sql
-- Run this in Supabase SQL Editor:
-- File: supabase/migrations/add_public_registration_token_policy.sql
```

Or copy the SQL from the migration file and run it in Supabase Dashboard → SQL Editor.

## Testing

1. **In Incognito/Private Window:**
   - Visit: `http://localhost:5173/candidates/register/{candidateId}?token={token}`
   - Should load without sidebar
   - Should show registration form
   - Should work without being logged in

2. **Verify:**
   - ✅ No sidebar/navigation visible
   - ✅ No "Not authenticated" error
   - ✅ Candidate data loads (if token is valid)
   - ✅ Form submission works

## URL Format

**Localhost:**
```
http://localhost:5173/candidates/register/{candidateId}?token={registrationToken}
```

**Production:**
```
https://www.coreflowhr.com/candidates/register/{candidateId}?token={registrationToken}
```
