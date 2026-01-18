# Setting Up Admin Account for Scraper

## Important: Admin Account Setup

All scraped candidates are saved under the **admin account**: `tendusstephan@gmail.com`

### Why Admin Account?

- Keeps scraped candidates separate from user-specific candidates
- Centralized management of all scraped data
- Prevents mixing scraped candidates with user's own candidates
- Easier to track and manage scraped candidate data

### Setup Steps

1. **Ensure Admin Account Exists**:
   - The account `tendusstephan@gmail.com` must exist in your Supabase auth
   - It should have a corresponding entry in the `profiles` table

2. **Verify Admin Account**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT id, email FROM auth.users WHERE email = 'tendusstephan@gmail.com';
   SELECT id, email FROM profiles WHERE email = 'tendusstephan@gmail.com';
   ```

3. **If Admin Account Doesn't Exist**:
   - Create the account in CoreFlow (sign up with tendusstephan@gmail.com)
   - Or create it manually in Supabase Auth dashboard
   - Ensure it has a profile entry

### How It Works

1. When scraping starts, the system looks up the admin user ID
2. All scraped candidates are saved with `user_id = admin_user_id`
3. Candidates are still linked to the specific job (`job_id`)
4. In CoreFlow, candidates appear under the admin account but are associated with the job

### Fallback Behavior

If the admin account is not found:
- The scraper will use the **job owner's account** as fallback
- A warning will be logged
- Scraping will continue normally
- This ensures scraping works even if admin account setup is incomplete

### Verification

After scraping, verify candidates are under admin account:

```sql
-- Check scraped candidates
SELECT 
  c.id,
  c.name,
  c.email,
  c.source,
  p.email as owner_email,
  j.title as job_title
FROM candidates c
JOIN profiles p ON c.user_id = p.id
JOIN jobs j ON c.job_id = j.id
WHERE c.source = 'scraped'
ORDER BY c.created_at DESC
LIMIT 10;
```

All scraped candidates should show `owner_email = 'tendusstephan@gmail.com'`



## Important: Admin Account Setup

All scraped candidates are saved under the **admin account**: `tendusstephan@gmail.com`

### Why Admin Account?

- Keeps scraped candidates separate from user-specific candidates
- Centralized management of all scraped data
- Prevents mixing scraped candidates with user's own candidates
- Easier to track and manage scraped candidate data

### Setup Steps

1. **Ensure Admin Account Exists**:
   - The account `tendusstephan@gmail.com` must exist in your Supabase auth
   - It should have a corresponding entry in the `profiles` table

2. **Verify Admin Account**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT id, email FROM auth.users WHERE email = 'tendusstephan@gmail.com';
   SELECT id, email FROM profiles WHERE email = 'tendusstephan@gmail.com';
   ```

3. **If Admin Account Doesn't Exist**:
   - Create the account in CoreFlow (sign up with tendusstephan@gmail.com)
   - Or create it manually in Supabase Auth dashboard
   - Ensure it has a profile entry

### How It Works

1. When scraping starts, the system looks up the admin user ID
2. All scraped candidates are saved with `user_id = admin_user_id`
3. Candidates are still linked to the specific job (`job_id`)
4. In CoreFlow, candidates appear under the admin account but are associated with the job

### Fallback Behavior

If the admin account is not found:
- The scraper will use the **job owner's account** as fallback
- A warning will be logged
- Scraping will continue normally
- This ensures scraping works even if admin account setup is incomplete

### Verification

After scraping, verify candidates are under admin account:

```sql
-- Check scraped candidates
SELECT 
  c.id,
  c.name,
  c.email,
  c.source,
  p.email as owner_email,
  j.title as job_title
FROM candidates c
JOIN profiles p ON c.user_id = p.id
JOIN jobs j ON c.job_id = j.id
WHERE c.source = 'scraped'
ORDER BY c.created_at DESC
LIMIT 10;
```

All scraped candidates should show `owner_email = 'tendusstephan@gmail.com'`

