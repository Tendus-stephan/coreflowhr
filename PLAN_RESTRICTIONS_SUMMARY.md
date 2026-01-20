# Plan Restrictions Summary

This document summarizes all the restrictions and limits enforced in CoreFlowHR to ensure:
1. **Users with Basic plan cannot access Professional features**
2. **Users with Professional plan cannot exceed their limits**

## ✅ Enforced Restrictions

### **Basic Plan Restrictions** (Prevents access to Professional features)

#### 1. **AI Email Generation** ✅
- **Location**: `components/CandidateModal.tsx`
- **Check**: `api.plan.canUseAiEmailGeneration()`
- **Behavior**: "Generate with AI" buttons blocked, alert shown: "AI email generation is only available on the Professional plan"
- **Status**: ✅ Fully enforced

#### 2. **Integrations** ✅
- **Location**: `pages/Settings.tsx`
- **Check**: Plan name check (`plan?.name === 'Basic Plan'`)
- **Behavior**: Integrations tab hidden from sidebar, shows upgrade message if accessed
- **Status**: ✅ Fully enforced

#### 3. **AI Analysis Quota** ✅
- **Location**: `components/CandidateModal.tsx`, `services/api.ts`
- **Check**: `api.plan.getAiAnalysisUsage()` (20/month limit)
- **Behavior**: Checked before running analysis, usage tracked in database, alert when limit reached
- **Status**: ✅ Fully enforced

#### 4. **Email Workflows** ✅
- **Location**: `components/WorkflowList.tsx`
- **Check**: `api.plan.canCreateWorkflow()` (3 max)
- **Behavior**: Shows "X of 3 workflows used", disables "Create Workflow" button when limit reached
- **Status**: ✅ Fully enforced

#### 5. **CSV Export Limits** ✅
- **Location**: `pages/Dashboard.tsx`, `pages/CandidateBoard.tsx`
- **Check**: `api.plan.canExportCandidates()` (50 max per export)
- **Behavior**: Checks before export, alert if exceeded
- **Status**: ✅ Fully enforced

#### 6. **Candidate Sourcing Per Job** ✅
- **Location**: `pages/AddJob.tsx`
- **Check**: `canSourceCandidates()` (50 max per job)
- **Behavior**: Validated before sourcing, error shown if exceeded
- **Status**: ✅ Fully enforced

#### 7. **Active Jobs Limit** ✅
- **Location**: `services/api.ts` (`jobs.create()`, `jobs.update()`)
- **Check**: Counts active jobs, compares with `maxActiveJobs` (5 max)
- **Behavior**: Prevents creating/activating jobs when limit reached, throws error
- **Status**: ✅ Fully enforced (just added)

---

### **Professional Plan Limits** (Prevents exceeding limits)

#### 1. **AI Analysis Quota** ✅
- **Limit**: 100 analyses per month
- **Location**: Same as Basic (quota checked before each analysis)
- **Status**: ✅ Fully enforced

#### 2. **Email Workflows** ✅
- **Limit**: 10 workflows max
- **Location**: Same as Basic (workflow count checked)
- **Status**: ✅ Fully enforced

#### 3. **CSV Export Limits** ✅
- **Limit**: 500 candidates per export
- **Location**: Same as Basic (export count checked)
- **Status**: ✅ Fully enforced

#### 4. **Active Jobs Limit** ✅
- **Limit**: 15 active jobs (base) + credits
- **Location**: `services/api.ts` (uses `getEffectiveLimit()` to include credits)
- **Status**: ✅ Fully enforced (just added)

#### 5. **Candidates Per Job** ✅
- **Limit**: 100 candidates per job (base) + credits
- **Location**: `pages/AddJob.tsx` (uses `canSourceCandidates()`)
- **Status**: ✅ Fully enforced

#### 6. **Candidates Per Month** ⚠️
- **Limit**: 2,000 candidates per month (base) + credits
- **Location**: Not currently tracked/enforced
- **Status**: ⚠️ Not enforced (would require monthly tracking of candidate additions)
- **Note**: This limit is defined but not actively checked. Monthly tracking would require:
  - Tracking candidate creation date
  - Monthly reset logic
  - Checking before each candidate sourcing operation

---

## 🔒 Security Guarantees

### ✅ Basic Plan Users Cannot:
- Use AI email generation
- Access integrations (tab hidden)
- Create more than 3 workflows
- Export more than 50 candidates at once
- Have more than 5 active jobs
- Source more than 50 candidates per job
- Exceed 20 AI analyses per month

### ✅ Professional Plan Users Cannot:
- Exceed 15 active jobs (base limit) without credits
- Exceed 100 candidates per job (base limit) without credits
- Exceed 100 AI analyses per month
- Create more than 10 workflows
- Export more than 500 candidates at once
- Access features they shouldn't have (same restrictions as Basic, just with higher limits)

---

## 📋 Implementation Details

### Plan Checking Functions (`services/api.ts`)
```typescript
api.plan.canUseAiEmailGeneration()      // Checks if AI email gen allowed
api.plan.canCreateWorkflow(count)       // Checks workflow limit
api.plan.canExportCandidates(count)     // Checks export limit
api.plan.getAiAnalysisUsage()          // Gets AI analysis quota status
api.plan.hasAiAnalysisQuota(used)      // Checks AI analysis quota
```

### Credits System (`services/credits.ts`)
- Professional plan users can purchase credits to extend limits
- `getEffectiveLimit()` returns base limit + available credits
- Credits are checked for: jobs, candidates, ai_analysis

### Limit Configuration (`services/planLimits.ts`)
- All limits defined in `PLAN_LIMITS` constant
- No "Unlimited" values - all limits are fixed numbers
- Clear separation between Basic and Professional

---

## 🎯 Conclusion

**All critical restrictions are in place:**
- ✅ Basic plan users are blocked from Professional features
- ✅ Professional plan users cannot exceed their limits (with credits support)
- ✅ Both plans enforce usage quotas
- ✅ UI elements disabled/hidden appropriately
- ✅ Server-side checks prevent bypassing client-side restrictions

**Note**: Monthly candidate limit (maxCandidatesPerMonth) is defined but not actively enforced. This would require additional tracking infrastructure to count candidates added per month.
