# Onboarding/Overview Page Plan

## Overview
Create an interactive onboarding/overview page that explains key system features before users can access the main application. This ensures users understand the platform's capabilities and how to use it effectively.

## User Flow

### First-Time User Journey
1. User signs up → Email verification
2. User logs in → **NEW: Onboarding Page** (if not completed)
3. User completes onboarding → Dashboard access
4. User can skip/return to onboarding later

### Returning User Journey
1. User logs in → Dashboard (onboarding already completed)
2. User can access onboarding from Settings → "View Tutorial" button

## Onboarding Page Structure

### Page: `/onboarding` or `/welcome`

**Components:**
1. **Progress Indicator** - Shows current step (e.g., "Step 2 of 6")
2. **Interactive Slides** - Each slide explains a key feature
3. **Skip Option** - "Skip Tutorial" button (can return later)
4. **Navigation** - Previous/Next buttons, or swipe gestures

### Slide Content (6-8 slides)

#### Slide 1: Welcome
- **Title:** "Welcome to CoreFlow!"
- **Content:**
  - Brief introduction to the platform
  - What CoreFlow does (recruitment management)
  - Key benefits overview
- **Visual:** Animated logo or hero image
- **Action:** "Get Started" button

#### Slide 2: Candidate Pipeline
- **Title:** "Manage Your Candidate Pipeline"
- **Content:**
  - Explain the Kanban board view
  - Show stages: New → Screening → Interview → Offer → Hired/Rejected
  - Drag-and-drop functionality
  - AI match scoring
- **Visual:** Screenshot or animated diagram of pipeline
- **Action:** "Next" button

#### Slide 3: Job Management
- **Title:** "Create and Manage Job Postings"
- **Content:**
  - Create job postings
  - Track applicants per job
  - Job statuses (Draft, Active, Closed)
  - Public application links
- **Visual:** Job card examples
- **Action:** "Next" button

#### Slide 4: Email Workflows
- **Title:** "Automated Email Workflows"
- **Content:**
  - Stage-based email automation
  - Customizable email templates
  - AI-generated email content
  - Email history tracking
- **Visual:** Workflow diagram
- **Action:** "Next" button

#### Slide 5: Interview Scheduling
- **Title:** "Schedule and Manage Interviews"
- **Content:**
  - Calendar view (monthly/weekly/daily)
  - Drag-and-drop rescheduling
  - Google Meet integration
  - Interview feedback/scorecards
- **Visual:** Calendar interface mockup
- **Action:** "Next" button

#### Slide 6: Offer Management
- **Title:** "Send and Track Job Offers"
- **Content:**
  - Create and send offers
  - Candidate response tracking
  - Counter offer support
  - Automatic stage updates
- **Visual:** Offer card example
- **Action:** "Next" button

#### Slide 7: AI Features
- **Title:** "AI-Powered Candidate Matching"
- **Content:**
  - AI match scoring
  - CV parsing and analysis
  - Candidate sourcing suggestions
  - Skills matching
- **Visual:** AI score visualization
- **Action:** "Next" button

#### Slide 8: Dashboard & Analytics
- **Title:** "Track Your Recruitment Metrics"
- **Content:**
  - Dashboard overview
  - Key metrics (active jobs, candidates, time to fill)
  - Activity feed
  - Quick actions
- **Visual:** Dashboard mockup
- **Action:** "Complete Tutorial" button → Navigate to Dashboard

## Implementation Details

### Database Schema Addition

```sql
-- Add onboarding completion tracking to user_settings or profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
```

### Component Structure

```
pages/
  Onboarding.tsx (main onboarding page)
  
components/
  onboarding/
    OnboardingSlide.tsx (individual slide component)
    OnboardingProgress.tsx (progress indicator)
    OnboardingNavigation.tsx (prev/next buttons)
```

### Routing Logic

**In `ProtectedRoute.tsx` or `App.tsx`:**
- Check if user has completed onboarding
- If not completed and first login → Redirect to `/onboarding`
- If completed → Allow normal navigation
- Add "View Tutorial" link in Settings

### User Preferences

**In Settings:**
- Add "Tutorial" section
- "View Tutorial Again" button
- "Mark as Completed" toggle (for testing)

## Design Specifications

### Visual Style
- **Layout:** Full-screen modal/slide overlay
- **Background:** Gradient or solid color with subtle pattern
- **Cards:** White cards with shadow, rounded corners
- **Typography:** Clear hierarchy, readable fonts
- **Colors:** Match existing CoreFlow design system

### Interactions
- **Navigation:** 
  - Previous/Next buttons
  - Keyboard arrows (← →)
  - Swipe gestures (mobile)
  - Progress dots (clickable)
- **Animations:**
  - Slide transitions (fade/slide)
  - Smooth progress bar updates
  - Subtle hover effects

### Responsive Design
- **Desktop:** Side-by-side content and visual
- **Tablet:** Stacked layout
- **Mobile:** Full-screen slides with swipe

## Content Guidelines

### Writing Style
- **Tone:** Friendly, professional, encouraging
- **Length:** 2-3 sentences per slide
- **Language:** Clear, jargon-free, action-oriented
- **Examples:** Use real-world scenarios

### Visual Guidelines
- **Screenshots:** Use actual UI screenshots (blur sensitive data)
- **Icons:** Use Lucide icons consistently
- **Diagrams:** Simple, clear flowcharts
- **Animations:** Subtle, not distracting

## Technical Implementation

### State Management
```typescript
interface OnboardingState {
  currentSlide: number;
  totalSlides: number;
  completed: boolean;
  skipped: boolean;
}
```

### API Integration
```typescript
// Mark onboarding as completed
api.settings.updateProfile({
  onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString()
});
```

### Local Storage (Optional)
- Store progress locally for better UX
- Sync with database on completion
- Allow resuming if user closes browser

## Optional Enhancements

### Interactive Demo
- **Sandbox Mode:** Let users try features in a safe environment
- **Sample Data:** Pre-populated demo candidates/jobs
- **Guided Tour:** Highlight specific UI elements

### Video Tutorials
- **Short Videos:** 30-60 second explainer videos
- **Embedded Players:** YouTube/Vimeo integration
- **Transcripts:** For accessibility

### Checklist
- **Feature Checklist:** "Try creating a job" → Checkbox
- **Progress Tracking:** Show what user has/hasn't tried
- **Rewards:** Unlock features as user completes tasks

## Success Metrics

### Completion Rate
- Track % of users who complete onboarding
- Track time to complete
- Track which slides users skip

### User Engagement
- Compare engagement between users who completed vs skipped
- Track feature adoption rates
- Monitor support ticket volume

## Implementation Priority

### Phase 1 (MVP) - Essential
1. ✅ Basic slide structure
2. ✅ 6-8 key feature slides
3. ✅ Navigation (prev/next)
4. ✅ Completion tracking
5. ✅ Redirect logic

### Phase 2 (Enhanced)
1. ⏳ Interactive demos
2. ⏳ Video tutorials
3. ⏳ Progress persistence
4. ⏳ Skip/resume functionality

### Phase 3 (Advanced)
1. ⏳ Personalized onboarding (based on user role)
2. ⏳ A/B testing different flows
3. ⏳ Analytics dashboard
4. ⏳ In-app tooltips/help

## Files to Create

1. `pages/Onboarding.tsx` - Main onboarding page
2. `components/onboarding/OnboardingSlide.tsx` - Slide component
3. `components/onboarding/OnboardingProgress.tsx` - Progress indicator
4. `components/onboarding/OnboardingNavigation.tsx` - Navigation controls
5. `supabase/migrations/add_onboarding_tracking.sql` - Database migration

## Next Steps

1. Create onboarding page component
2. Add database migration for tracking
3. Update routing logic
4. Add "View Tutorial" to Settings
5. Test user flow
6. Gather feedback and iterate


