# Remember Me & Onboarding Walkthrough Information

## 1. "Remember Me" Checkbox Status

### Current State: ❌ Not Functional

The "Remember Me" checkbox in `pages/Login.tsx` (line 193) is currently **not connected to any functionality**. It's just a UI element.

### Why It Doesn't Need to Work

Supabase Auth **automatically persists sessions** in `localStorage` by default, which means:
- ✅ Sessions persist across browser restarts
- ✅ Users stay logged in even after closing the browser
- ✅ No additional code needed for basic "remember me" functionality

### If You Want to Make It Functional

You could implement it to control session storage type:
- **Checked (Remember Me)**: Use `localStorage` (persists forever until logout)
- **Unchecked**: Use `sessionStorage` (clears when browser closes)

However, this would require custom session management, which Supabase doesn't support out of the box.

**Recommendation**: Leave it as-is (cosmetic) OR remove it since sessions already persist.

---

## 2. First-Time Login Walkthrough Code

### How It Works

The walkthrough is triggered in `components/ProtectedRoute.tsx` when a user first accesses the dashboard.

### Trigger Logic (ProtectedRoute.tsx, lines 144-248)

```typescript
// Check if user should see onboarding
useEffect(() => {
  const checkOnboarding = async () => {
    // 1. Check if already completed
    if (profile?.onboarding_completed) {
      setOnboardingCompleted(true);
      return;
    }

    // 2. Check if user is subscribed
    if (!isSubscribed) {
      setOnboardingCompleted(true); // Don't show if not subscribed
      return;
    }

    // 3. Check if user has existing data
    const hasExistingData = hasJobs || hasCandidates;

    // 4. Check if user is newly subscribed (within 7 days)
    const accountAge = Date.now() - new Date(accountCreatedDate).getTime();
    const isNewlySubscribed = accountAge < (7 * 24 * 60 * 60 * 1000);

    // 5. Only show if:
    //    - Not completed
    //    - Subscribed
    //    - Newly subscribed (within 7 days)
    //    - No existing data
    //    - Accessing dashboard
    const shouldShowOnboarding = 
      !profile?.onboarding_completed &&
      isSubscribed &&
      isNewlySubscribed &&
      !hasExistingData &&
      location.pathname === '/dashboard';

    if (shouldShowOnboarding) {
      // Redirect to onboarding
      navigate('/onboarding', { replace: true });
    }
  };
}, [session, user, location.pathname]);
```

### Onboarding Page Structure (pages/Onboarding.tsx)

The walkthrough consists of **8 slides**:

1. **Welcome to CoreFlow!** - Introduction
2. **Manage Your Candidate Pipeline** - Kanban board explanation
3. **Create and Manage Job Postings** - Job management
4. **Automated Email Workflows** - Email automation
5. **Schedule and Manage Interviews** - Calendar features
6. **Send and Track Job Offers** - Offer management
7. **AI-Powered Candidate Matching** - AI scoring
8. **Track Your Recruitment Metrics** - Dashboard analytics

### Key Features

- **Progress Bar**: Shows current step (e.g., "Step 2 of 8")
- **Navigation**: Previous/Next buttons, keyboard arrows (← →), ESC to skip
- **Progress Dots**: Clickable dots to jump to any slide
- **Detailed Instructions**: Each slide has:
  - How to Use (step-by-step)
  - Common Issues & Solutions
  - Pro Tips
- **Completion**: Marks `onboarding_completed: true` in `profiles` table
- **Skip Option**: Users can skip and mark as completed

### Completion Logic

When user completes or skips:
```typescript
const markOnboardingCompleted = async () => {
  await supabase
    .from('profiles')
    .update({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString()
    })
    .eq('id', user.id);
};
```

### Files Involved

1. **`pages/Onboarding.tsx`** - Main walkthrough component (680 lines)
2. **`components/ProtectedRoute.tsx`** - Triggers redirect to onboarding (lines 144-248)
3. **`App.tsx`** - Routes `/onboarding` path (line 132-137)

### When Walkthrough Shows

✅ User is subscribed  
✅ Account created within last 7 days  
✅ No existing jobs or candidates  
✅ Accessing `/dashboard`  
✅ Hasn't completed onboarding before  

### When Walkthrough Doesn't Show

❌ Already completed onboarding  
❌ Not subscribed  
❌ Account older than 7 days  
❌ Has existing data (jobs/candidates)  
❌ Not on dashboard route  

---

## Summary

- **Remember Me**: Not functional, but sessions already persist (no action needed)
- **Walkthrough**: Fully functional, shows for first-time subscribed users with no data

