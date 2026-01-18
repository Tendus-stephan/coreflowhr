# Troubleshooting: Registration Email Not Sent

## Issue
After a candidate registers their email, they are moved to Screening stage but don't receive the CV upload email.

## Why This Happens

The registration process:
1. ✅ Saves candidate email
2. ✅ Moves candidate to "Screening" stage  
3. ✅ Attempts to execute Screening workflow
4. ❌ **Workflow may not execute if conditions aren't met**

## Common Causes

### 1. **No Screening Workflow Configured** (Most Common)
- **Check**: Go to Settings → Email Workflows
- **Look for**: A workflow with trigger stage = "Screening"
- **Fix**: Create a Screening workflow if it doesn't exist

### 2. **Workflow is Disabled**
- **Check**: Settings → Email Workflows → Find Screening workflow
- **Look for**: Toggle switch - should be ON (green/enabled)
- **Fix**: Enable the workflow

### 3. **No Email Template**
- **Check**: Settings → Email Templates → Find "Screening" template
- **Fix**: Create a Screening email template if missing

### 4. **Workflow Conditions Not Met**
- **Check**: Screening workflow settings
- **Look for**: "Minimum AI Match Score" or other conditions
- **Fix**: Remove conditions or ensure candidate meets them

### 5. **Email Service Issues**
- **Check**: Browser console for errors
- **Look for**: Resend API errors, email sending failures
- **Fix**: Verify Resend API key is configured in Supabase secrets

## How to Check Logs

After a candidate registers, check the browser console for:

```
[Registration] Executing Screening workflow for candidate {id}
[Workflow Engine] Found X enabled workflow(s) for stage "Screening"
```

If you see:
- `No enabled workflows found for stage "Screening"` → **No workflow configured**
- `Workflow conditions not met` → **Conditions need adjustment**
- `Email template not found` → **Template missing**

## Quick Fix

1. **Go to Settings → Email Workflows**
2. **Create/Enable Screening Workflow:**
   - Name: "Send Screening Email"
   - Trigger Stage: "Screening"
   - Email Template: Select a Screening template
   - Enabled: ✅ ON
   - Conditions: Leave empty (or set appropriate values)

3. **Test:**
   - Have a candidate register again
   - Check console logs
   - Verify email is sent

## Verification Steps

1. ✅ Screening workflow exists in Settings
2. ✅ Workflow is enabled (toggle ON)
3. ✅ Workflow has an email template assigned
4. ✅ Email template exists and has content
5. ✅ No restrictive conditions (or candidate meets them)
6. ✅ Resend API key is configured

## Next Steps

After fixing the workflow, test with a new registration. The enhanced logging will show exactly what's happening during workflow execution.
