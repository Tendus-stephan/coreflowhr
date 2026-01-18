# CoreFlowHR Demo Guide
## Complete Walkthrough for Showing Users How the Site Works

This guide will help you demonstrate CoreFlowHR effectively to potential users, showing the complete workflow from job posting to candidate hiring.

---

## 📋 Pre-Demo Preparation

### 1. **Set Up Demo Account**
- Create a dedicated demo account or use a test account
- Ensure you have at least one active job posting ready
- Have some sourced candidates in the "New" stage
- Set up at least one email workflow (Screening stage)

### 2. **Prepare Demo Data**
- **Sample Job**: Create a realistic job (e.g., "Senior Software Engineer" or "Marketing Manager")
  - Include detailed description
  - Add 5-10 relevant skills
  - Set experience level (Entry/Mid/Senior)
  - Set location
  
- **Sample Candidates**: 
  - Have 3-5 candidates in "New" stage (without emails)
  - Have 2-3 candidates in "Screening" stage (with emails)
  - Have 1-2 candidates in "Interview" stage

### 3. **Check Integrations**
- Verify email templates are set up
- Check that email workflows are enabled
- Ensure billing/subscription is active (for sourcing limits)

---

## 🎬 Demo Flow (20-30 minutes)

### **PART 1: Platform Overview (2-3 min)**

#### Start at Dashboard (`/dashboard`)
**What to Show:**
- Overview statistics (total candidates, active jobs, interviews, offers)
- Activity feed showing recent actions
- Quick navigation sidebar
- Recent candidates and jobs widgets

**Key Points to Mention:**
- "This is your command center - see everything at a glance"
- "All your recruitment activities are tracked and displayed here"
- "The sidebar gives you quick access to all major features"

---

### **PART 2: Job Management (3-4 min)**

#### Navigate to Jobs (`/jobs`)
**What to Show:**
1. **Job List View**
   - Show Active, Draft, Closed tabs
   - Point out scraping status badges (succeeded/failed/partial)

2. **Create New Job** (or edit existing)
   - Click "Create Job" or edit an existing one
   - Fill in job details:
     - Title: "Senior Software Engineer"
     - Department: "Engineering"
     - Location: "Remote"
     - Type: "Full-time"
   - **Highlight the Skills section:**
     - "This is critical - add all core skills required"
     - Add 5-8 skills (e.g., "JavaScript", "React", "Node.js", "TypeScript", "AWS")
   - **Set Experience Level:**
     - Choose "Senior Level (5+ years)" or appropriate level
   - **Set Status to Active:**
     - "Once set to Active, candidates are automatically sourced"

**Key Points:**
- "Job details must be accurate - this affects candidate matching"
- "Skills are critical - the more specific, the better matches"
- "Experience level helps filter candidates appropriately"
- "Candidates are sourced automatically when job is Active"

---

### **PART 3: Candidate Sourcing & New Stage (4-5 min)**

#### Show Candidate Sourcing Process
**What to Show:**
1. **After Job is Active:**
   - Return to Jobs page
   - Point out scraping status: "succeeded" or show it happening
   - Click on the job to see candidate count

2. **Navigate to Candidates (`/candidates`)**
   - Show Kanban board with stages
   - Point out "New" column with candidates
   - **Key Point:** "These candidates don't have emails yet - they were sourced from LinkedIn"

3. **Open a Candidate Card (New Stage)**
   - Click on a candidate in "New" stage
   - Show the Candidate Modal
   - **Overview Tab:**
     - Show portfolio data (LinkedIn link, work experience)
     - Point out: "This data came from LinkedIn scraping"
     - Show AI analysis if available
   - **Email Tab:**
     - **Critical:** Point out the "Outreach" section
     - "This appears because the candidate has no email"
   - **Generate Outreach Message:**
     - Click "Generate Outreach Message"
     - Show the AI-generated LinkedIn message
     - Show the registration link in the message
     - Explain: "This link allows the candidate to register their email"

**Key Points:**
- "Candidates are sourced from LinkedIn automatically"
- "New candidates don't have emails - this is by design for privacy"
- "You contact them first via LinkedIn outreach"
- "The registration link collects their email for future communication"

---

### **PART 4: LinkedIn Outreach & Registration (3-4 min)**

#### Demonstrate Outreach Flow
**What to Show:**
1. **Copy Outreach Message:**
   - Show the generated message with registration link
   - Click "Copy Message to Clipboard"
   - Explain: "Paste this on LinkedIn when messaging the candidate"

2. **Explain Registration Process** (you can simulate or show the page):
   - Navigate to or describe the registration page
   - "Candidate clicks the registration link"
   - "They enter their email address"
   - "System automatically moves them to 'Screening' stage"
   - "Screening workflow triggers - sends CV upload email"

**Key Points:**
- "First contact is via LinkedIn - respectful and compliant"
- "Registration collects email for future automated emails"
- "After registration, automation takes over"

---

### **PART 5: Email Workflows & Screening (3-4 min)**

#### Show Email Automation
**Navigate to Settings → Email Workflows (`/settings`)**

**What to Show:**
1. **Workflow List:**
   - Show existing workflows (especially Screening workflow)
   - Explain: "Workflows trigger automatically when candidates move stages"

2. **Create/Edit Screening Workflow:**
   - Show workflow configuration
   - Point out: "Trigger stage: Screening"
   - Show email template selection
   - Explain: "This must exist before generating outreach messages"

3. **Back to Candidates:**
   - Show a candidate in "Screening" stage (with email)
   - Open candidate modal → Email tab
   - Show email history if available
   - Explain: "CV upload email was sent automatically"

**Key Points:**
- "Workflows automate email sending based on stage changes"
- "Screening workflow is required before outreach (ensures CV upload emails work)"
- "Once candidate has email, workflows handle all future communication"

---

### **PART 6: Candidate Pipeline Management (4-5 min)**

#### Show Stage Movement
**Navigate to Candidates (`/candidates`)**

**What to Show:**
1. **Drag and Drop:**
   - Drag a candidate from "Screening" to "Interview" stage
   - Explain: "Just drag and drop to move candidates"
   - Show any automatic actions (workflows, notifications)

2. **Interview Stage:**
   - Open candidate in "Interview" stage
   - Show Email tab - mention interview emails
   - Navigate to Calendar

3. **Calendar Integration (`/calendar`):**
   - Show calendar view (monthly/weekly/daily)
   - Schedule an interview:
     - Click time slot
     - Select candidate
     - Choose date, time, duration
     - Select type (Google Meet/Phone/In-Person)
     - Show Google Meet link auto-generation
   - Drag and drop to reschedule (if time permits)

**Key Points:**
- "Intuitive drag-and-drop stage management"
- "Calendar syncs interviews automatically"
- "Video links generated automatically for Google Meet"

---

### **PART 7: Offers & Hiring (3-4 min)**

#### Show Offer Management
**Navigate to Offers (`/offers`) or from Candidate Modal**

**What to Show:**
1. **Create Offer:**
   - Open candidate in "Offer" stage (or create offer)
   - Fill in offer details:
     - Position title
     - Salary (amount, currency, period)
     - Start date
     - Benefits
     - Expiration date
   - Send offer email

2. **Offer Response:**
   - Explain: "Candidate receives email with offer details and response link"
   - "They can accept, decline, or counter-offer"
   - "If accepted, candidate automatically moves to 'Hired' stage"

3. **Hired Stage:**
   - Show candidate in "Hired" stage
   - Explain: "Final stage - onboarding email sent automatically"

**Key Points:**
- "Offers are professional and trackable"
- "Candidates can respond directly via email link"
- "Automatic stage updates based on responses"

---

### **PART 8: Advanced Features (3-4 min)**

#### Quick Tour of Additional Features
**What to Show:**

1. **AI Features:**
   - Candidate analysis in candidate modal
   - AI match scoring
   - AI email generation

2. **Email Templates (`/settings`):**
   - Show template editor
   - Show AI generation for templates
   - Show placeholders ({candidate_name}, {job_title}, etc.)

3. **Settings Overview:**
   - Plan/subscription info
   - Integrations (Google Calendar, Meet, Teams)
   - Security settings

**Key Points:**
- "AI powers candidate matching and email generation"
- "Templates are customizable with AI assistance"
- "Integrations sync with your existing tools"

---

## 🎯 Key Messages Throughout Demo

### Emphasize These Points:

1. **Privacy-First Approach:**
   - "We respect candidate privacy - no emails collected without consent"
   - "LinkedIn outreach is the initial contact method"

2. **Automation:**
   - "Once candidates register, workflows automate everything"
   - "Save time with automated emails and stage management"

3. **AI-Powered:**
   - "AI matches candidates to jobs"
   - "AI generates outreach messages and emails"

4. **Professional & Scalable:**
   - "Handle multiple jobs and candidates efficiently"
   - "Track everything in one place"

---

## 💡 Common Questions & Answers

### Q: "How do candidates get sourced?"
**A:** "When you post a job as Active, our system automatically scrapes LinkedIn profiles matching your job criteria. Candidates are saved with their portfolio data, but no email - you contact them first via LinkedIn."

### Q: "Why don't candidates have emails?"
**A:** "Privacy and compliance. We can't legally scrape emails from LinkedIn. You contact candidates first via LinkedIn, they register their email, then we can send automated emails."

### Q: "What if a workflow doesn't exist?"
**A:** "The system will remind you. For example, you must create a Screening workflow before generating outreach messages - this ensures candidates receive CV upload emails after registering."

### Q: "Can I customize emails?"
**A:** "Absolutely. Go to Settings → Email Templates. You can edit templates manually or use AI to generate new content. Templates support placeholders like {candidate_name}, {job_title}, etc."

### Q: "What about plan limits?"
**A:** "Basic plan: 50 candidates per job, 5 active jobs, 500 candidates per month. Professional plan: Unlimited everything. Limits are enforced automatically."

### Q: "Can I integrate with my calendar?"
**A:** "Yes! Connect Google Calendar in Settings → Integrations. Interviews will sync bi-directionally. Google Meet links are auto-generated."

---

## 📝 Demo Checklist

Before starting, ensure:
- [ ] Demo account is set up
- [ ] At least one Active job exists with candidates
- [ ] Candidates in multiple stages (New, Screening, Interview)
- [ ] Screening workflow is enabled
- [ ] Email templates are set up
- [ ] Calendar integration connected (optional)
- [ ] No test/error data visible

---

## 🚀 Tips for a Great Demo

1. **Tell a Story:** Follow one candidate from sourcing to hiring
2. **Show, Don't Tell:** Let the UI speak - point out features as you use them
3. **Address Pain Points:** "This solves [common recruitment problem]"
4. **Be Honest:** If something doesn't work, acknowledge it and move on
5. **Keep It Moving:** Don't spend too long on one feature
6. **End Strong:** Summarize key benefits at the end

---

## 🎬 Quick Demo Script (15-minute version)

If you only have 15 minutes:

1. **Dashboard (1 min)** - Show overview
2. **Jobs (2 min)** - Show job creation, point out sourcing
3. **Candidates - New Stage (3 min)** - Show outreach generation
4. **Candidates - Screening (2 min)** - Show workflow automation
5. **Pipeline Movement (2 min)** - Drag and drop stages
6. **Calendar (2 min)** - Schedule interview
7. **Offers (2 min)** - Create and send offer
8. **Wrap-up (1 min)** - Key benefits summary

---

## 📞 After Demo

1. **Answer Questions:** Leave time for Q&A
2. **Follow Up:** Offer to send detailed documentation
3. **Trial Access:** If applicable, offer free trial or demo account
4. **Next Steps:** Schedule follow-up or next meeting

---

Good luck with your demo! 🎉