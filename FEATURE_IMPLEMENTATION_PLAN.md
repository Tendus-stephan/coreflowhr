# Feature Implementation Plan
## Coreflow ATS Enhancement Features

This document outlines the comprehensive plan for implementing 6 major features:
1. Candidate Notes & Comments
2. Interview Feedback/Scorecards
3. Email Communication History
4. Calendar/Interview Management
5. Automated Email Workflows (Stage-based)
6. Offer Management

---

## 1. Candidate Notes & Comments

### Overview
Allow recruiters to add internal notes and comments to candidate profiles for team collaboration and tracking.

### Database Schema

```sql
-- Create notes table
CREATE TABLE IF NOT EXISTS candidate_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false, -- Private notes only visible to creator
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Index for fast lookups
CREATE INDEX idx_candidate_notes_candidate_id ON candidate_notes(candidate_id);
CREATE INDEX idx_candidate_notes_user_id ON candidate_notes(user_id);
CREATE INDEX idx_candidate_notes_created_at ON candidate_notes(created_at DESC);

-- RLS Policies
ALTER TABLE candidate_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes for their candidates"
    ON candidate_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM candidates
            WHERE candidates.id = candidate_notes.candidate_id
            AND candidates.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create notes for their candidates"
    ON candidate_notes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM candidates
            WHERE candidates.id = candidate_notes.candidate_id
            AND candidates.user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own notes"
    ON candidate_notes FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notes"
    ON candidate_notes FOR DELETE
    USING (user_id = auth.uid());
```

### UI/UX Design

**Location:** New "Notes" tab in CandidateModal

**Features:**
- List of notes (chronological, newest first)
- Add note button with textarea
- Edit/Delete own notes
- Show author name and timestamp
- Private/Public toggle (future: team collaboration)
- Rich text support (optional, start with plain text)
- Character count (optional)

**Components:**
- `components/CandidateNotes.tsx` - Notes tab content
- `components/ui/NoteCard.tsx` - Individual note display
- `components/ui/NoteEditor.tsx` - Add/Edit note form

### API Endpoints

```typescript
// In services/api.ts
candidates: {
    // ... existing methods
    
    getNotes: async (candidateId: string): Promise<Note[]>
    addNote: async (candidateId: string, content: string, isPrivate?: boolean): Promise<Note>
    updateNote: async (noteId: string, content: string): Promise<Note>
    deleteNote: async (noteId: string): Promise<void>
}
```

### Implementation Steps

1. **Database Migration** - Create notes table
2. **TypeScript Types** - Add Note interface
3. **API Methods** - Implement CRUD operations
4. **UI Component** - Create Notes tab
5. **Integration** - Add to CandidateModal
6. **Activity Logging** - Log note creation (optional)

---

## 2. Interview Feedback/Scorecards

### Overview
Allow recruiters to rate and provide structured feedback after interviews.

### Database Schema

```sql
-- Create interview_feedback table
CREATE TABLE IF NOT EXISTS interview_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Overall ratings (1-5 scale)
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    technical_skills INTEGER CHECK (technical_skills >= 1 AND technical_skills <= 5),
    communication INTEGER CHECK (communication >= 1 AND communication <= 5),
    cultural_fit INTEGER CHECK (cultural_fit >= 1 AND cultural_fit <= 5),
    problem_solving INTEGER CHECK (problem_solving >= 1 AND problem_solving <= 5),
    
    -- Text feedback
    strengths TEXT,
    weaknesses TEXT,
    overall_impression TEXT,
    recommendation TEXT CHECK (recommendation IN ('Strong Yes', 'Yes', 'Maybe', 'No', 'Strong No')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- One feedback per interview per user
    UNIQUE(interview_id, user_id)
);

-- Indexes
CREATE INDEX idx_interview_feedback_interview_id ON interview_feedback(interview_id);
CREATE INDEX idx_interview_feedback_candidate_id ON interview_feedback(candidate_id);
CREATE INDEX idx_interview_feedback_user_id ON interview_feedback(user_id);

-- RLS Policies
ALTER TABLE interview_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback for their interviews"
    ON interview_feedback FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = interview_feedback.interview_id
            AND interviews.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create feedback for their interviews"
    ON interview_feedback FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM interviews
            WHERE interviews.id = interview_feedback.interview_id
            AND interviews.user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own feedback"
    ON interview_feedback FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
```

### UI/UX Design

**Location:** 
- New "Feedback" section in Interview details
- Accessible from CandidateModal → Interviews section
- Or from Calendar/Interview Management page

**Features:**
- Star ratings (1-5) for each category
- Text areas for strengths, weaknesses, overall impression
- Recommendation dropdown
- View all feedback for a candidate (aggregate view)
- Average ratings display
- Timeline of all interview feedback

**Components:**
- `components/InterviewFeedback.tsx` - Feedback form
- `components/InterviewFeedbackCard.tsx` - Display feedback
- `components/FeedbackSummary.tsx` - Aggregate view

### API Endpoints

```typescript
interviews: {
    // ... existing methods
    
    getFeedback: async (interviewId: string): Promise<InterviewFeedback | null>
    submitFeedback: async (interviewId: string, feedback: FeedbackData): Promise<InterviewFeedback>
    updateFeedback: async (feedbackId: string, feedback: FeedbackData): Promise<InterviewFeedback>
    getCandidateFeedback: async (candidateId: string): Promise<InterviewFeedback[]> // All feedback for candidate
}
```

### Implementation Steps

1. **Database Migration** - Create feedback table
2. **TypeScript Types** - Add InterviewFeedback interface
3. **API Methods** - Implement feedback operations
4. **UI Component** - Create feedback form
5. **Integration** - Add to interview modals/details
6. **Aggregate View** - Show feedback summary in candidate profile

---

## 3. Email Communication History

### Overview
Track and display all email communications with candidates in a threaded view.

### Database Schema

```sql
-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Email details
    to_email TEXT NOT NULL,
    from_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL, -- HTML content
    email_type TEXT CHECK (email_type IN ('Screening', 'Interview', 'Offer', 'Rejection', 'Hired', 'Custom')),
    
    -- Status tracking
    status TEXT CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')) DEFAULT 'sent',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Threading (for replies)
    thread_id UUID, -- Links related emails
    reply_to_id UUID REFERENCES email_logs(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes
CREATE INDEX idx_email_logs_candidate_id ON email_logs(candidate_id);
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_thread_id ON email_logs(thread_id);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);

-- RLS Policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their email logs"
    ON email_logs FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create email logs"
    ON email_logs FOR INSERT
    WITH CHECK (user_id = auth.uid());
```

### UI/UX Design

**Location:** New "Communication" section in CandidateModal (enhance existing tab)

**Features:**
- Chronological list of all emails
- Threaded view (group related emails)
- Email preview (subject, snippet, date)
- Click to view full email
- Status indicators (sent, delivered, opened)
- Filter by email type
- Search emails
- Quick reply (future)

**Components:**
- `components/EmailHistory.tsx` - Email list component
- `components/EmailThread.tsx` - Threaded view
- `components/EmailCard.tsx` - Individual email display
- `components/EmailViewer.tsx` - Full email view modal

### API Endpoints

```typescript
candidates: {
    // ... existing methods
    
    getEmailHistory: async (candidateId: string): Promise<EmailLog[]>
    getEmailThread: async (threadId: string): Promise<EmailLog[]>
}

// Update existing email sending to log emails
// In send-email edge function, log to email_logs table
```

### Implementation Steps

1. **Database Migration** - Create email_logs table
2. **Update Email Sending** - Log all sent emails
3. **TypeScript Types** - Add EmailLog interface
4. **API Methods** - Fetch email history
5. **UI Component** - Create email history view
6. **Integration** - Add to CandidateModal Communication tab
7. **Email Tracking** - Add open/click tracking (future)

---

## 4. Calendar/Interview Management

### Overview
Comprehensive calendar view for managing interviews with scheduling, rescheduling, and conflict detection.

### Database Schema

```sql
-- Enhance existing interviews table (already exists, add fields if needed)
-- Add fields for better calendar management
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- Create interview_attendees table (for multiple interviewers)
CREATE TABLE IF NOT EXISTS interview_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('interviewer', 'observer')) DEFAULT 'interviewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(interview_id, user_id)
);

-- Create interview_conflicts table (track scheduling conflicts)
CREATE TABLE IF NOT EXISTS interview_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
    conflicting_interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    resolved BOOLEAN DEFAULT false
);
```

### UI/UX Design

**Location:** New `/calendar` page

**Features:**
- Monthly/Weekly/Daily calendar views
- Color-coded by interview type
- Click to view/edit interview details
- Drag-and-drop rescheduling
- Conflict warnings
- Filter by interviewer, candidate, job
- Quick schedule from calendar
- Interview reminders
- Export to Google Calendar/iCal

**Components:**
- `pages/Calendar.tsx` - Main calendar page
- `components/CalendarView.tsx` - Calendar component
- `components/InterviewEvent.tsx` - Calendar event
- `components/InterviewDetailsModal.tsx` - View/edit interview
- `components/ConflictWarning.tsx` - Conflict detection UI

### API Endpoints

```typescript
interviews: {
    // ... existing methods
    
    getCalendar: async (startDate: string, endDate: string, filters?: CalendarFilters): Promise<Interview[]>
    checkConflicts: async (interviewId: string, date: string, time: string, duration: number): Promise<Conflict[]>
    reschedule: async (interviewId: string, newDate: string, newTime: string): Promise<Interview>
    cancel: async (interviewId: string, reason?: string): Promise<void>
    getUpcoming: async (days?: number): Promise<Interview[]>
    exportToICal: async (interviewIds: string[]): Promise<string> // iCal format
}
```

### Implementation Steps

1. **Database Enhancements** - Add calendar-related fields
2. **Calendar Library** - Choose library (react-big-calendar or similar)
3. **API Methods** - Implement calendar operations
4. **Calendar Page** - Create main calendar view
5. **Event Components** - Create interview event displays
6. **Conflict Detection** - Implement conflict checking
7. **Rescheduling** - Add drag-and-drop or modal reschedule
8. **Integration** - Link from Dashboard and CandidateModal

---

## 5. Automated Email Workflows (Stage-based)

### Overview
Automatically send emails when candidates move to specific stages.

### Database Schema

```sql
-- Create email_workflows table
CREATE TABLE IF NOT EXISTS email_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Workflow configuration
    name TEXT NOT NULL,
    trigger_stage TEXT CHECK (trigger_stage IN ('New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected')) NOT NULL,
    email_template_id TEXT REFERENCES email_templates(id) ON DELETE CASCADE NOT NULL,
    
    -- Conditions (optional filters)
    min_match_score INTEGER, -- Only trigger if match score >= this
    source_filter TEXT[], -- Only trigger for specific sources
    
    -- Settings
    enabled BOOLEAN DEFAULT true,
    delay_minutes INTEGER DEFAULT 0, -- Delay before sending
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create workflow_executions table (track when workflows ran)
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES email_workflows(id) ON DELETE CASCADE NOT NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
    email_log_id UUID REFERENCES email_logs(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'skipped')) DEFAULT 'pending',
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    error_message TEXT
);

-- Indexes
CREATE INDEX idx_email_workflows_user_id ON email_workflows(user_id);
CREATE INDEX idx_email_workflows_trigger_stage ON email_workflows(trigger_stage);
CREATE INDEX idx_workflow_executions_candidate_id ON workflow_executions(candidate_id);
```

### UI/UX Design

**Location:** Settings → Email Workflows section

**Features:**
- List of all workflows
- Create/Edit/Delete workflows
- Enable/Disable toggle
- Test workflow
- View execution history
- Workflow builder UI (simple form)

**Components:**
- `pages/Settings.tsx` - Add Email Workflows tab
- `components/EmailWorkflowBuilder.tsx` - Create/edit workflow
- `components/WorkflowList.tsx` - List of workflows
- `components/WorkflowExecutionHistory.tsx` - Execution logs

### API Endpoints

```typescript
workflows: {
    list: async (): Promise<EmailWorkflow[]>
    get: async (workflowId: string): Promise<EmailWorkflow>
    create: async (workflow: WorkflowData): Promise<EmailWorkflow>
    update: async (workflowId: string, workflow: WorkflowData): Promise<EmailWorkflow>
    delete: async (workflowId: string): Promise<void>
    toggle: async (workflowId: string, enabled: boolean): Promise<EmailWorkflow>
    test: async (workflowId: string, candidateId: string): Promise<void>
    getExecutions: async (workflowId: string): Promise<WorkflowExecution[]>
}

// Update candidate update to trigger workflows
// In api.candidates.update(), check for workflows matching new stage
```

### Implementation Steps

1. **Database Migration** - Create workflow tables
2. **Workflow Engine** - Create edge function or service to execute workflows
3. **API Methods** - Implement workflow CRUD
4. **UI Components** - Create workflow builder
5. **Integration** - Hook into candidate stage changes
6. **Settings Page** - Add workflows section
7. **Execution Tracking** - Log all workflow executions

---

## 6. Offer Management

### Overview
Complete offer management system for creating, sending, and tracking job offers.

### Database Schema

```sql
-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Offer details
    position_title TEXT NOT NULL,
    start_date DATE,
    salary_amount DECIMAL(10, 2),
    salary_currency TEXT DEFAULT 'USD',
    salary_period TEXT CHECK (salary_period IN ('hourly', 'monthly', 'yearly')) DEFAULT 'yearly',
    benefits TEXT[], -- Array of benefits
    notes TEXT,
    
    -- Status tracking
    status TEXT CHECK (status IN ('draft', 'sent', 'viewed', 'negotiating', 'accepted', 'declined', 'expired')) DEFAULT 'draft',
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Response details
    response TEXT, -- Candidate's response/notes
    negotiation_history JSONB, -- Track negotiation rounds
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create offer_templates table
CREATE TABLE IF NOT EXISTS offer_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL, -- HTML template with placeholders
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes
CREATE INDEX idx_offers_candidate_id ON offers(candidate_id);
CREATE INDEX idx_offers_job_id ON offers(job_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_expires_at ON offers(expires_at);

-- RLS Policies
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their offers"
    ON offers FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create offers"
    ON offers FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their offers"
    ON offers FOR UPDATE
    USING (user_id = auth.uid());
```

### UI/UX Design

**Location:** 
- New "Offers" tab in CandidateModal
- New `/offers` page for managing all offers
- Offer creation modal

**Features:**
- Create offer from candidate profile
- Offer templates
- Fill offer details (salary, benefits, start date)
- Send offer email
- Track offer status
- View offer acceptance/decline
- Negotiation tracking
- Offer expiration handling
- Move candidate to "Hired" on acceptance

**Components:**
- `pages/Offers.tsx` - Offers management page
- `components/OfferModal.tsx` - Create/edit offer
- `components/OfferCard.tsx` - Display offer
- `components/OfferStatusBadge.tsx` - Status indicator
- `components/OfferTemplateSelector.tsx` - Template picker

### API Endpoints

```typescript
offers: {
    list: async (filters?: OfferFilters): Promise<Offer[]>
    get: async (offerId: string): Promise<Offer>
    create: async (offer: OfferData): Promise<Offer>
    update: async (offerId: string, offer: Partial<OfferData>): Promise<Offer>
    send: async (offerId: string): Promise<Offer> // Send offer email
    accept: async (offerId: string, response?: string): Promise<Offer> // Candidate accepts
    decline: async (offerId: string, response?: string): Promise<Offer> // Candidate declines
    negotiate: async (offerId: string, negotiationData: NegotiationData): Promise<Offer>
    expire: async (offerId: string): Promise<Offer>
    getTemplates: async (): Promise<OfferTemplate[]>
    createTemplate: async (template: TemplateData): Promise<OfferTemplate>
}
```

### Implementation Steps

1. **Database Migration** - Create offers and templates tables
2. **TypeScript Types** - Add Offer interfaces
3. **API Methods** - Implement offer CRUD operations
4. **Offer Modal** - Create offer creation/edit UI
5. **Offers Page** - Create offers management page
6. **Email Integration** - Send offer emails
7. **Status Tracking** - Track offer views and responses
8. **Integration** - Link from CandidateModal
9. **Auto-stage Update** - Move to Hired on acceptance

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- ✅ Database migrations for all features
- ✅ TypeScript type definitions
- ✅ Basic API endpoints structure

### Phase 2: Core Features (Week 3-4)
1. **Candidate Notes** - Simple notes system
2. **Email History** - Track and display emails
3. **Interview Feedback** - Basic feedback form

### Phase 3: Advanced Features (Week 5-6)
4. **Calendar Management** - Calendar view and scheduling
5. **Email Workflows** - Automated stage-based emails
6. **Offer Management** - Complete offer system

### Phase 4: Polish & Integration (Week 7-8)
- UI/UX refinements
- Performance optimization
- Testing and bug fixes
- Documentation

---

## Technical Considerations

### Dependencies
- **Calendar Library:** Consider `react-big-calendar` or `fullcalendar`
- **Email Tracking:** May need webhook integration with email service
- **Real-time Updates:** Consider Supabase Realtime for live updates

### Performance
- Index all foreign keys and frequently queried fields
- Paginate email history and notes
- Cache calendar data
- Optimize workflow execution

### Security
- RLS policies for all new tables
- Validate user permissions
- Sanitize user inputs
- Rate limit workflow executions

### Testing Strategy
- Unit tests for API methods
- Integration tests for workflows
- E2E tests for critical flows
- Manual testing for UI components

---

## Migration Files Needed

1. `add_candidate_notes.sql`
2. `add_interview_feedback.sql`
3. `add_email_logs.sql`
4. `enhance_interviews_calendar.sql`
5. `add_email_workflows.sql`
6. `add_offers_management.sql`

---

## Next Steps

1. Review and approve this plan
2. Start with Phase 1 (database migrations)
3. Implement features in priority order
4. Test each feature before moving to next
5. Gather feedback and iterate

---

## Questions to Consider

1. **Team Collaboration:** Should notes be visible to all team members or private?
2. **Email Tracking:** Do we need open/click tracking, or just sent status?
3. **Calendar Integration:** Should we integrate with Google Calendar/Outlook?
4. **Workflow Limits:** Should there be limits on workflow executions?
5. **Offer Expiration:** Default expiration period for offers?

