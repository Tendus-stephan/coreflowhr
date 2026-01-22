# Agency Concepts Explained

## 🤔 What You're Confused About

### 1. Multi-Client Management

## What is a "Client" in Agency Terms?

**A client = A company that hires you to find candidates for them**

### Example Scenario:

You run a recruitment agency. You work with 3 companies:

1. **TechCorp** (your client)
   - They need: Software Engineers, Product Managers
   - You post jobs for them
   - You find candidates for their roles

2. **HealthCare Inc** (your client)
   - They need: Nurses, Doctors
   - You post jobs for them
   - You find candidates for their roles

3. **FinanceCo** (your client)
   - They need: Accountants, Financial Analysts
   - You post jobs for them
   - You find candidates for their roles

### The Problem Right Now:

**Your current system:**
- All jobs are mixed together
- Can't tell which job belongs to which client
- Can't show TechCorp "here are your candidates"
- Can't separate data by client

**What agencies need:**
- Group jobs by client
- "Show me all TechCorp jobs"
- "Show me all candidates for HealthCare Inc"
- Client-specific reports

### Simple Solution:

Add a "Client" field to jobs:

```
Jobs Table:
- id
- user_id (your agency)
- client_id (NEW - which company this job is for)
- title
- description
- ...
```

**In the UI:**
- Dropdown: "Select Client" when creating job
- Filter: "Show only TechCorp jobs"
- Dashboard: "TechCorp: 5 active jobs, 20 candidates"

---

## 2. Placement Tracking

## What is a "Placement"?

**A placement = When you successfully place a candidate in a job**

### How Agencies Make Money:

Agencies charge fees when they place someone:

**Example:**
- TechCorp hires a Software Engineer you found
- You charge TechCorp: $5,000 (or 20% of salary)
- This is a "placement"

### The Problem Right Now:

**Your current system:**
- You can mark candidate as "Hired"
- But you can't track:
  - Which client paid you?
  - How much did they pay?
  - When did they pay?
  - How many placements this month?

**What agencies need:**
- Track when a candidate gets hired
- Record which client they were placed with
- Record the fee/commission
- Calculate revenue per client
- See "I made $15,000 this month from placements"

### Simple Solution:

Add a "Placements" table:

```
Placements Table:
- id
- candidate_id (who got placed)
- job_id (which job)
- client_id (which client paid)
- placement_date
- fee_amount
- status (pending_payment, paid, etc.)
```

**In the UI:**
- When candidate moves to "Hired" → Ask: "Record placement?"
- Enter: Client, Fee amount
- Dashboard shows: "This month: 5 placements, $25,000 revenue"

---

## 🎯 Do You Actually Need These?

### Question 1: Do you work with multiple companies?

**If YES** → You need multi-client management
- You need to separate jobs by company
- You need client-specific views

**If NO** (you only work with one company) → You DON'T need it
- Your current system works fine
- Focus on other features

### Question 2: Do you charge placement fees?

**If YES** → You need placement tracking
- You need to track which placements made money
- You need to calculate revenue

**If NO** (you charge hourly or flat fee) → You DON'T need it
- Your current system works fine
- Focus on other features

---

## 💡 My Recommendation

### If You're a Solo Recruiter:
- **Multi-client**: Maybe (if you work with multiple companies)
- **Placement tracking**: Maybe (if you charge per placement)

### If You're an Agency (multiple recruiters):
- **Multi-client**: YES - You definitely need this
- **Placement tracking**: YES - You need to track revenue

---

## 🚀 Simple Implementation (If You Need It)

### Multi-Client Management (Simple Version):

1. **Add "Clients" table:**
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL, -- "TechCorp"
  contact_email TEXT,
  created_at TIMESTAMP
);
```

2. **Add client_id to jobs:**
```sql
ALTER TABLE jobs ADD COLUMN client_id UUID REFERENCES clients(id);
```

3. **In UI:**
- When creating job: "Select Client" dropdown
- Jobs page: Filter by client
- Dashboard: Show jobs grouped by client

**That's it!** Simple but effective.

---

### Placement Tracking (Simple Version):

1. **Add "Placements" table:**
```sql
CREATE TABLE placements (
  id UUID PRIMARY KEY,
  candidate_id UUID REFERENCES candidates(id),
  job_id UUID REFERENCES jobs(id),
  client_id UUID REFERENCES clients(id),
  placement_date DATE,
  fee_amount DECIMAL(10,2),
  status TEXT, -- 'pending', 'paid'
  created_at TIMESTAMP
);
```

2. **In UI:**
- When candidate moves to "Hired": Show "Record Placement?" button
- Form: Select client, enter fee amount
- Dashboard: Show placements and revenue

**That's it!** Simple but effective.

---

## ❓ Questions for You:

1. **Do you work with multiple companies?**
   - If yes → You need multi-client
   - If no → Skip it

2. **Do you charge per placement?**
   - If yes → You need placement tracking
   - If no → Skip it

3. **What's your main pain point?**
   - Managing multiple clients?
   - Tracking revenue?
   - Something else?

---

**Bottom Line**: These features are only needed if you work with multiple companies and charge placement fees. If you're a solo recruiter working with one company, your current system is fine!
