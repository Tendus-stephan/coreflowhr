# Workflow Auto-Trigger Confirmation

## ✅ YES - Workflows ARE Automatically Triggered

When a candidate is moved to a stage, workflows are **automatically triggered** by the system.

## How It Works

### 1. **Manual Stage Change** (via UI - drag & drop or dropdown)

**Location**: `services/api.ts` lines 2280-2291

```typescript
// Execute workflows for the new stage
if (updates.stage !== undefined) {
    const shouldSkipIfAlreadySent = updates.stage === 'Screening' || updates.stage === 'Offer';
    try {
        const { executeWorkflowsForStage } = await import('./workflowEngine');
        await executeWorkflowsForStage(candidateId, updates.stage, userId, shouldSkipIfAlreadySent);
    } catch (workflowError) {
        console.error('Error executing workflows:', workflowError);
    }
}
```

**Process**:
1. Candidate stage is updated in database
2. System automatically calls `executeWorkflowsForStage()`
3. Workflow engine finds all enabled workflows for that stage
4. Executes each workflow (sends emails)

---

### 2. **Registration Flow** (when candidate registers email)

**Location**: `services/api.ts` lines 2611-2639

```typescript
// Execute Screening workflow to send email with CV upload link
if (candidate.user_id) {
    try {
        const { executeWorkflowsForStage } = await import('./workflowEngine');
        await executeWorkflowsForStage(candidateId, 'Screening', candidate.user_id, false);
    } catch (workflowError) {
        console.error('Error executing screening workflow after registration:', workflowError);
    }
}
```

**Process**:
1. Candidate registers email
2. Stage automatically changed to "Screening"
3. System automatically calls `executeWorkflowsForStage('Screening', ...)`
4. Workflow engine finds Screening workflows and executes them

---

### 3. **CV Upload Flow** (when candidate uploads CV)

**Location**: `services/api.ts` lines 1900-1911

```typescript
// If moved to Screening, execute workflows if configured
if (shouldMoveToScreening) {
    try {
        const { executeWorkflowsForStage } = await import('./workflowEngine');
        await executeWorkflowsForStage(existingCandidate.id, 'Screening', job.user_id, true);
    } catch (workflowError) {
        console.error('Error executing screening workflow:', workflowError);
    }
}
```

---

## When Workflows Are SKIPPED

Even though workflows are automatically triggered, they may NOT execute if:

### ❌ No Workflow Configured
- **Check**: Settings → Email Workflows
- **Fix**: Create a workflow for that stage

### ❌ Workflow is Disabled
- **Check**: Toggle switch in Settings → Email Workflows
- **Fix**: Enable the workflow

### ❌ "New" Stage (Always Skipped)
- **Reason**: Candidates don't have emails yet
- **Status**: By design - LinkedIn outreach is used instead

### ❌ "Interview" Stage (Always Skipped)
- **Reason**: Interviews are manually scheduled
- **Status**: By design - not automatic

### ❌ Candidate Has No Email
- **Check**: Candidate's email field is null/empty
- **Fix**: Candidate must register email first

### ❌ Workflow Conditions Not Met
- **Check**: Minimum match score or other conditions
- **Fix**: Adjust conditions or ensure candidate meets them

---

## Testing Workflow Execution

### Check Browser Console:

**Successful Execution:**
```
[Workflow Engine] Found 1 enabled workflow(s) for stage "Screening"
[Workflow Engine] Executing workflow...
```

**No Workflow Found:**
```
[Workflow Engine] No enabled workflows found for stage "Screening" (user: {userId})
```

**Workflow Skipped:**
```
[Workflow Engine] Skipping "New" stage workflow...
```

---

## Summary

✅ **YES** - Workflows are automatically triggered when:
- Candidate is manually moved to a stage (UI)
- Candidate registers email (moves to Screening)
- Candidate uploads CV (moves to Screening)
- Candidate is moved via API

❌ **BUT** - Workflows may not execute if:
- No workflow is configured for that stage
- Workflow is disabled
- Stage is "New" or "Interview" (always skipped)
- Candidate has no email
- Workflow conditions aren't met

---

## Verification Steps

1. **Check if workflow exists**: Settings → Email Workflows
2. **Check if enabled**: Toggle should be ON
3. **Check candidate has email**: Should not be null
4. **Check console logs**: Look for workflow execution messages
5. **Check email was sent**: Look in email logs/history
