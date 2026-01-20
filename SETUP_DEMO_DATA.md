# Setup Demo Data for coreflowhr@gmail.com

This guide will help you set up comprehensive demo data for the `coreflowhr@gmail.com` account.

## Quick Setup

### Option 1: Using SQL Script (Recommended)

1. **Open Supabase SQL Editor**
   - Go to your Supabase Dashboard
   - Navigate to SQL Editor
   - Create a new query

2. **Run the SQL Script**
   - Copy the contents of `setup-demo-data.sql`
   - Paste into SQL Editor
   - Click "Run" to execute

3. **Verify Setup**
   - The script will output success messages
   - Check that no errors occurred
   - Log in as `coreflowhr@gmail.com` to view the data

### Option 2: Manual Setup via UI

If you prefer to set up data manually through the application UI:

1. **Log in as coreflowhr@gmail.com**
2. **Create Jobs**:
   - Go to Jobs → Create New Job
   - Create 2-3 jobs (mix of Active and Draft status)
   - Ensure at least one job is Active with skills defined

3. **Source Candidates** (if job scraping is enabled):
   - Jobs set to "Active" will automatically source candidates
   - Or manually create candidates via the UI

4. **Set Up Email Workflows**:
   - Go to Settings → Email Workflows
   - Create workflows for: Screening, Offer, Hired, Rejected
   - Ensure workflows are enabled

5. **Move Candidates Through Stages**:
   - Go to Candidates page
   - Drag and drop candidates to different stages
   - This will demonstrate the pipeline flow

## What the Demo Data Includes

After running the SQL script, you'll have:

### Jobs (3 total)
- **Senior Software Engineer** (Active) - Remote
- **Marketing Manager** (Active) - New York, NY  
- **Business Analyst** (Draft) - San Francisco, CA

### Candidates (9 total)

**For Software Engineer Job:**
- 2 candidates in "New" stage (no emails - for outreach demo)
- 1 candidate in "Screening" stage (has email)
- 1 candidate in "Interview" stage
- 1 candidate in "Offer" stage
- 1 candidate in "Hired" stage
- 1 candidate in "Rejected" stage

**For Marketing Manager Job:**
- 1 candidate in "New" stage (no email)
- 1 candidate in "Screening" stage (has email)

### Email Workflows (4 total)
- Screening workflow (enabled)
- Offer workflow (enabled)
- Hired workflow (enabled)
- Rejected workflow (enabled)

## Verification Steps

After running the script, verify the data:

```sql
-- Check jobs
SELECT id, title, status, department 
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'coreflowhr@gmail.com');

-- Check candidates by stage
SELECT stage, COUNT(*) as count
FROM candidates 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'coreflowhr@gmail.com')
GROUP BY stage;

-- Check workflows
SELECT name, trigger_stage, enabled 
FROM email_workflows 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'coreflowhr@gmail.com');
```

## Demo Flow Suggestions

Once data is set up, you can demonstrate:

1. **Job Management**: Show the 3 jobs (2 Active, 1 Draft)
2. **Candidate Pipeline**: Show candidates across all stages
3. **LinkedIn Outreach**: Generate outreach message for "New" stage candidates
4. **Email Workflows**: Show automated emails triggered by stage changes
5. **Drag and Drop**: Move candidates between stages
6. **AI Analysis**: View AI match scores and analysis
7. **Search & Filter**: Filter by job, stage, or search by name/skills

## Troubleshooting

### Error: "User with email coreflowhr@gmail.com not found"

**Solution**: The account doesn't exist yet. Create it first:
1. Sign up at your application URL with `coreflowhr@gmail.com`
2. Complete email verification
3. Complete onboarding
4. Then run the SQL script again

### No Candidates Appearing

**Solution**: Check that:
1. User ID was found correctly
2. Job IDs were created
3. Candidates have correct `user_id` and `job_id` references

### Workflows Not Created

**Solution**: Ensure default email templates exist:
1. When a user signs up, default templates are automatically created
2. If missing, create templates manually in Settings → Email Templates
3. Then re-run the workflow creation part of the script

## Customization

To customize the demo data:

1. **Modify job details**: Edit the `INSERT INTO jobs` statements
2. **Add more candidates**: Copy and modify the candidate INSERT statements
3. **Change stages**: Update the `stage` value in candidate INSERTs
4. **Add interviews**: Create interview records linked to candidates in "Interview" stage
5. **Add offers**: Create offer records linked to candidates in "Offer" stage

## Notes

- All demo candidates have realistic data (names, skills, locations)
- AI match scores range from 45-94 (various quality levels)
- Some candidates have emails, some don't (to demonstrate outreach flow)
- Dates are set relative to current date for realistic timelines
- The script is idempotent - you can run it multiple times, but duplicate candidates may be created

## Next Steps

After setting up demo data:
1. Log in as `coreflowhr@gmail.com`
2. Explore the Dashboard to see overview statistics
3. Navigate to Candidates to see the pipeline
4. Test drag-and-drop functionality
5. Generate outreach messages for "New" candidates
6. Review email workflows in Settings

---

**Ready to demo!** 🚀