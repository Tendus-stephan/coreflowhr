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

When Professional plan users exceed **base limits**, they see messages mentioning credits but **cannot purchase them yet**:

#### 1. **Active Jobs (15 base + credits)**
- **Location**: `services/api.ts`
- **Behavior**:
  - Error thrown: *"Your Professional plan allows up to 15 active jobs (X with credits). Please close or archive existing jobs before creating new active ones, or upgrade your plan."*
  - **Current Issue**: Message mentions "with credits" but no way to purchase credits
  - **Action Needed**: Credits purchase UI

#### 2. **AI Analysis Quota (100/month)**
- **Location**: `components/CandidateModal.tsx`
- **Behavior**:
  - Alert shown: *"You've reached your monthly AI analysis limit (100 analyses). Upgrade to Professional for..."* (message is incorrect - they're already on Pro)
  - **Action Needed**: Better message + credits purchase option

#### 3. **Workflow Limit (10 max)**
- **Location**: `components/WorkflowList.tsx`
- **Behavior**:
  - Alert shown: *"Your Professional plan allows up to 10 email workflows. Upgrade to Professional..."* (message is incorrect)
  - **Action Needed**: Better message + credits purchase option

#### 4. **CSV Export (500 max)**
- **Location**: `pages/Dashboard.tsx`, `pages/CandidateBoard.tsx`
- **Behavior**:
  - Alert shown: *"Your Professional plan allows up to 500 candidates per export. Please filter to fewer candidates or upgrade to Professional."*
  - **Action Needed**: Better message (no upgrade needed, but credits could help)

---

## ❌ Missing Implementation: Credits Purchase Flow

### What's Implemented ✅
1. **Credits System Backend** (`services/credits.ts`)
   - `purchaseCredits()` - Creates credit record
   - `getAvailableCredits()` - Gets current credits
   - `getEffectiveLimit()` - Calculates base + credits
   - `useCredits()` - Deducts credits when used

2. **Database Schema** (`user_credits` table)
   - Stores credits by type (jobs, candidates, ai_analysis)
   - Tracks expiration dates
   - RLS policies in place

3. **Plan Checks Use Credits**
   - `getEffectiveLimit()` is called in job creation checks
   - Credits are factored into effective limits

### What's Missing ❌

#### 1. **Credits Purchase UI**
- No "Credits" tab in Settings
- No way to view current credits balance
- No way to purchase credits
- No Stripe integration for credit purchases

#### 2. **Better Error Messages**
- Professional users see incorrect "upgrade to Professional" messages
- Messages should mention credits purchase option
- Should show current usage vs. effective limit (base + credits)

#### 3. **Usage Dashboard**
- No display of:
  - Current credits balance
  - Usage vs. effective limit
  - Credit purchase options

---

## 📋 Recommended Implementation

### Phase 1: Add Credits Tab to Settings

```typescript
// In pages/Settings.tsx
{ id: 'credits', label: 'Credits', icon: Sparkles, requiresProfessional: true }
```

### Phase 2: Credits Display & Purchase UI

1. **Display Current Credits**
   - Show credits by type (jobs, candidates, AI analysis)
   - Show current usage vs. effective limit
   - Show credit expiration dates

2. **Purchase Credits**
   - "Purchase Credits" button
   - Modal with credit packages:
     - Additional Jobs Pack: $15 per 5 additional active jobs
     - Additional Candidates Pack: $10 per 500 candidates
     - Additional AI Analysis Pack: $5 per 100 AI analyses
   - Stripe checkout for credit purchases

3. **Update Error Messages**
   - Professional users: Show credits purchase option
   - Include "Purchase Credits" button in error alerts
   - Show effective limit (base + credits) in messages

### Phase 3: Stripe Integration for Credits

1. Create Stripe Products for credit packs
2. Add credit purchase to checkout flow
3. Webhook handler to add credits after payment
4. Display credit purchase history

---

## 🎯 Current User Experience Summary

### Basic Plan Users Exceeding Quota:
- ✅ Clear upgrade prompts
- ✅ Direct path to upgrade (Settings > Billing)
- ✅ All actions blocked appropriately
- **Result**: User must upgrade to Professional to continue

### Professional Plan Users Exceeding Base Limits:
- ⚠️ Blocked from actions
- ⚠️ Messages mention credits but can't purchase
- ⚠️ Must reduce usage or wait (no credits purchase option)
- **Result**: User is stuck - can't use more, can't buy more

---

## 💡 Immediate Fixes Needed

1. **Fix Professional Error Messages**
   - Remove "upgrade to Professional" when already on Pro
   - Add "purchase credits" messaging instead

2. **Add Credits Purchase Path** (Even if UI not built)
   - Contact support option
   - Manual credit purchase flow (temporary)

3. **Improve Usage Visibility**
   - Show current usage vs. limit in relevant modals
   - Display effective limit (base + credits) clearly

---

## 🚀 Future Enhancement

Full credits purchase flow would allow:
- Professional users to instantly extend limits
- Better UX for high-volume users
- Additional revenue stream
- Self-service model
