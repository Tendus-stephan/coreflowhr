# What Happens When Users Exceed Quota

This document describes the current behavior when users try to exceed their plan limits and what actions they can take.

## Current Behavior When Quota Exceeded

### 🔴 Basic Plan Users

When Basic plan users exceed quotas, they are **blocked** with upgrade prompts:

#### 1. **AI Email Generation**
- **Location**: `components/CandidateModal.tsx`
- **Behavior**: 
  - Action blocked
  - Alert shown: *"AI email generation is only available on the Professional plan. Upgrade to Professional to use this feature."*
  - **No direct action** - user must navigate to Settings/Billing manually to upgrade

#### 2. **AI Analysis Quota (20/month)**
- **Location**: `components/CandidateModal.tsx`
- **Behavior**:
  - Action blocked
  - Alert shown: *"You've reached your monthly AI analysis limit (20 analyses). Upgrade to Professional for 100 AI analyses per month."*
  - **Action**: Must upgrade to Professional plan

#### 3. **Workflow Limit (3 max)**
- **Location**: `components/WorkflowList.tsx`
- **Behavior**:
  - "Create Workflow" button disabled
  - Shows: *"3 of 3 workflows used"*
  - Alert shown when clicked: *"Your Basic plan allows up to 3 email workflows. Upgrade to Professional for up to 10 workflows."*
  - **Action**: Must upgrade to Professional plan

#### 4. **CSV Export (50 max)**
- **Location**: `pages/Dashboard.tsx`, `pages/CandidateBoard.tsx`
- **Behavior**:
  - Export blocked
  - Alert shown: *"Your Basic plan allows up to 50 candidates per export. Please select fewer candidates or upgrade to Professional."*
  - **Action**: Must reduce selection or upgrade

#### 5. **Active Jobs (5 max)**
- **Location**: `services/api.ts` (`jobs.create()`, `jobs.update()`)
- **Behavior**:
  - Job creation/activation blocked
  - Error thrown: *"Your Basic plan allows up to 5 active jobs. Please close or archive existing jobs before creating new active ones, or upgrade your plan."*
  - **Action**: Must archive jobs or upgrade

#### 6. **Candidates Per Job (50 max)**
- **Location**: `pages/AddJob.tsx`
- **Behavior**:
  - Sourcing blocked
  - Error shown: *"Your Basic plan allows up to 50 candidates per job. Upgrade to Professional for up to 100 candidates per job."*
  - **Action**: Must reduce count or upgrade

#### 7. **Integrations**
- **Location**: `pages/Settings.tsx`
- **Behavior**:
  - Tab hidden from sidebar
  - If accessed: Shows upgrade message with "Upgrade to Professional" button
  - **Action**: Button redirects to billing/upgrade

---

### 🟡 Professional Plan Users

When Professional plan users exceed **their fixed limits**, they see clear messages. There is **no credits system** anymore:

#### 1. **Active Jobs (15 max)**
- **Location**: `services/api.ts`
- **Behavior**:
  - Error thrown: *"Your Professional plan allows up to 15 active jobs. Please close or archive existing jobs before creating new active ones, or upgrade your plan."*
  - **Action Needed**: None (this is the intended behavior)

#### 2. **AI Analysis Quota (100/month)**
- **Location**: `components/CandidateModal.tsx`
- **Behavior**:
  - Alert shown: *"You've reached your monthly AI analysis limit (X analyses). Upgrade to Professional to increase your monthly AI analysis quota."*
  - **Action Needed**: None related to credits (message no longer mentions credits)

#### 3. **Workflow Limit (10 max)**
- **Location**: `components/WorkflowList.tsx`
- **Behavior**:
  - Alert shown: *"Your Professional plan allows up to 10 email workflows."*
  - **Action Needed**: None related to credits

#### 4. **CSV Export (500 max)**
- **Location**: `pages/Dashboard.tsx`, `pages/CandidateBoard.tsx`
- **Behavior**:
  - Alert shown: *"Your Professional plan allows up to 500 candidates per export. Please filter to fewer candidates."*
  - **Action Needed**: None related to credits

---

## ❌ Credits System Removed

There is **no credits system** anymore:

- No `services/credits.ts` in the codebase.
- `user_credits` table, if it exists in your database, is no longer used by the app.
- All limits are **fixed per plan** (Basic vs Professional) and enforced directly via `PLAN_LIMITS` and server checks.

If you want to fully clean up the database later, you can drop the `user_credits` table and related policies via a follow-up SQL migration.

---

## 🚀 Future Enhancement

Full credits purchase flow would allow:
- Professional users to instantly extend limits
- Better UX for high-volume users
- Additional revenue stream
- Self-service model
