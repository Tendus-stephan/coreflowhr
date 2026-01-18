# Scraper Quick Start Guide

## Complete Workflow

### Step 1: Create Job in CoreFlow
1. Go to **http://localhost:3002**
2. Log in
3. **Jobs** → Create/Activate a job
4. Make sure status is **"Active"**
5. Fill in: Title, Skills, Location, Description

### Step 2: Scrape Candidates
1. Go to **http://localhost:3003** (Scraper UI)
2. Click **"Refresh"** to see your job
3. **Select your job**
4. **Configure**:
   - Sources: LinkedIn, GitHub, Job Boards
   - Max Candidates: **50** (default, max 200)
   - Min Match Score: **60** (default)
5. Click **"Start Scraping"**
6. Wait for completion

### Step 3: View Candidates
1. Go back to **http://localhost:3002** (CoreFlow)
2. **Candidates** section
3. Filter by **source: 'scraped'**
4. All candidates are under **admin account** (tendusstephan@gmail.com)
5. They're linked to your job

## Important Settings

### Admin Account
- **Email**: tendusstephan@gmail.com
- **Purpose**: All scraped candidates are saved under this account
- **Setup**: Make sure this account exists in your Supabase

### Candidate Caps
- **Default**: 50 candidates per job
- **Maximum**: 200 candidates per job
- **Why**: Controls API costs (Apify, ScraperAPI charge per request)

### Cost Control
- **50 candidates** ≈ $0.25-$0.50 (Apify)
- **200 candidates** ≈ $1-$2 (Apify)
- Start with 10-20 for testing!

## Setup Admin Account (One-Time)

If admin account lookup fails, set it manually:

1. **Find Admin User ID**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT id, email FROM auth.users WHERE email = 'tendusstephan@gmail.com';
   ```

2. **Add to .env.local**:
   ```env
   ADMIN_USER_ID=your_user_id_here
   ```

3. **Restart scraper UI**

## Troubleshooting

- **"No active jobs"**: Create/activate job in CoreFlow first
- **"Provider not configured"**: Add API keys to `.env.local`
- **"Admin user not found"**: Set `ADMIN_USER_ID` in `.env.local`
- **High costs**: Reduce "Max Candidates" to 10-20 for testing



## Complete Workflow

### Step 1: Create Job in CoreFlow
1. Go to **http://localhost:3002**
2. Log in
3. **Jobs** → Create/Activate a job
4. Make sure status is **"Active"**
5. Fill in: Title, Skills, Location, Description

### Step 2: Scrape Candidates
1. Go to **http://localhost:3003** (Scraper UI)
2. Click **"Refresh"** to see your job
3. **Select your job**
4. **Configure**:
   - Sources: LinkedIn, GitHub, Job Boards
   - Max Candidates: **50** (default, max 200)
   - Min Match Score: **60** (default)
5. Click **"Start Scraping"**
6. Wait for completion

### Step 3: View Candidates
1. Go back to **http://localhost:3002** (CoreFlow)
2. **Candidates** section
3. Filter by **source: 'scraped'**
4. All candidates are under **admin account** (tendusstephan@gmail.com)
5. They're linked to your job

## Important Settings

### Admin Account
- **Email**: tendusstephan@gmail.com
- **Purpose**: All scraped candidates are saved under this account
- **Setup**: Make sure this account exists in your Supabase

### Candidate Caps
- **Default**: 50 candidates per job
- **Maximum**: 200 candidates per job
- **Why**: Controls API costs (Apify, ScraperAPI charge per request)

### Cost Control
- **50 candidates** ≈ $0.25-$0.50 (Apify)
- **200 candidates** ≈ $1-$2 (Apify)
- Start with 10-20 for testing!

## Setup Admin Account (One-Time)

If admin account lookup fails, set it manually:

1. **Find Admin User ID**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT id, email FROM auth.users WHERE email = 'tendusstephan@gmail.com';
   ```

2. **Add to .env.local**:
   ```env
   ADMIN_USER_ID=your_user_id_here
   ```

3. **Restart scraper UI**

## Troubleshooting

- **"No active jobs"**: Create/activate job in CoreFlow first
- **"Provider not configured"**: Add API keys to `.env.local`
- **"Admin user not found"**: Set `ADMIN_USER_ID` in `.env.local`
- **High costs**: Reduce "Max Candidates" to 10-20 for testing

