# Browser test checklist – run one by one

**App URL:** http://localhost:5173 (or the port shown in the terminal after `npm run dev`)

Log in first, then go through each test. Tick when done.

---

## Test 1: Job templates – Start from template (new job)

1. Go to **Jobs** → **Post a new job** (or open `/jobs/new`).
2. **Check:** You see a **“Start from a template”** section with a dropdown.
3. **Check:** Dropdown has **“Blank job”** plus **“Software Engineer (built-in)”**, **“Product Manager (built-in)”**, **“Sales Representative (built-in)”**, and any of your saved templates.
4. Select **“Software Engineer (built-in)”**.
5. **Check:** Form prefills: Title “Software Engineer”, Skills “JavaScript, TypeScript, React, Node.js”, Description and type/experience set.
6. **Pass:** ✓ Templates load and applying one prefills the form.

---

## Test 2: Save as template (edit job)

1. Go to **Jobs** → open any **Active** or **Draft** job for editing (e.g. click Edit or go to `/jobs/edit/<id>`).
2. **Check:** You see a **“Save as template”** button.
3. Click **“Save as template”**.
4. **Check:** An inline input **“Template name”** and **Save** / **Cancel** appear.
5. Enter a name (e.g. `My Test Template`) and click **Save**.
6. **Check:** No error; inline UI closes.
7. Go to **Post a new job** again.
8. **Check:** In “Start from a template”, your new template (e.g. `My Test Template`) appears in the dropdown.
9. **Pass:** ✓ Save as template works and new job can use it.

---

## Test 3: Failed scrape – “What to try” on job card

*Requires at least one job that has **failed** or **partial** sourcing.*

1. Go to **Jobs**.
2. Find a job card that shows **“Sourcing failed”** or **“Partial sourcing”** with an error message.
3. **Check:** Below the error you see **“What to try:”** and a short suggestion (e.g. try shorter title, city name, etc.).
4. Click **“Retry Sourcing”** (or “Continue Sourcing” for partial).
5. **Check:** When retry fails, the **alert** also includes **“What to try: …”**.
6. **Pass:** ✓ Suggestions show on the card and in the retry alert.

*If you have no failed job:* Post a new job with a very narrow title/location so sourcing fails, then repeat steps 2–6.

---

## Test 4: Monthly scrape limit (if you hit the limit)

*Only applicable if your account is at the monthly scrape limit.*

1. Go to **Jobs** → **Post a new job** and post with sourcing, or **Retry Sourcing** on an existing job.
2. **Check:** You see a message like **“Monthly scrape limit reached”** or **“Upgrade to Pro or wait until …”** and sourcing does not run.
3. **Check:** Jobs page or dashboard shows something like **“X of Y scrapes remaining”** (if that UI exists).
4. **Pass:** ✓ Limit is enforced and message is clear.

*If you’re under the limit:* Skip or note “N/A – under limit”.

---

## Test 5: LinkedIn “Also in” (cross-job duplicate)

*Requires the same person (same LinkedIn profile) in two different jobs.*

1. Go to **Candidates** (pipeline).
2. Use the job filter and pick a job that has candidates.
3. **Check:** If any candidate appears in **another job** (same person, same profile): the card shows **“Also in: <Other Job Title>”** (or “Also in: Other job”).
4. Click that candidate to open the **candidate modal**.
5. **Check:** Modal shows **“Also in pipeline:”** with a link to the other job (e.g. job title linking to `/candidates?job=<id>`).
6. Click that link.
7. **Check:** You’re on the pipeline with the **job filter** set to that other job.
8. **Pass:** ✓ “Also in” appears on card and in modal; link filters pipeline correctly.

*If you don’t have duplicates:* Note “N/A – no cross-job duplicates”.

---

## Test 6: Skill match tags (green/red) on pipeline

1. Go to **Candidates** (pipeline).
2. In the **job filter**, select **one specific job** (not “All jobs”).
3. **Check:** Each candidate card shows **skill tags**.
4. **Check:** Some tags are **green** (match job’s required skills) and some **red** (not in job’s list). If job has no skills, all may be gray.
5. **Pass:** ✓ Green/red skill tags appear when one job is selected.

---

## Test 7: One-line AI summary on pipeline card

1. Stay on **Candidates** (pipeline).
2. Find a candidate who has **AI analysis** (e.g. has been scored or has analysis text).
3. **Check:** Below the skill tags, the card shows a **short one-line summary** (first sentence or ~80 chars of the AI analysis), with a border above it.
4. **Pass:** ✓ One-line summary appears when AI analysis exists.

*If no candidates have AI analysis:* Note “N/A – no AI analysis on candidates”.

---

## Test 8: Tenure on pipeline card and modal

1. On **Candidates**, find a candidate with **years of experience** or **work history**.
2. **Check:** On the **card** you see a line like **“5yr exp”** or **“2yr at CompanyName”** (or “at CompanyName”) under location.
3. Open that candidate’s **modal**.
4. **Check:** In the header area you see a **tenure/experience** line (e.g. “5yr exp” or “2yr at Company” with a briefcase icon).
5. **Pass:** ✓ Tenure appears on card and in modal when data exists.

---

## Test 9: Post-scrape notification

*Requires running a real sourcing run.*

1. Go to **Jobs** → **Post a new job** (or use **Retry Sourcing** on a job).
2. Fill required fields, post, and **start sourcing** (or trigger retry).
3. Wait until sourcing **finishes** (success or failure).
4. **Check:** An **in-app notification** appears: either **“Sourcing complete”** (with candidate count) or **“Sourcing failed”** (with message). Check the bell/dropdown if it doesn’t pop.
5. **Pass:** ✓ Notification appears after sourcing completes.

*If sourcing is not configured:* Note “N/A – scraper not run”.

---

## Test 10: Weekly digest toggle

1. Go to **Settings**.
2. Open the **Notifications** (or **Preferences**) section.
3. **Check:** There is a **“Weekly digest”** toggle with description like “Weekly summary of jobs and pipeline activity (in-app notification)”.
4. Turn it **ON** and save (if there’s an explicit save).
5. **Check:** No error; preference is saved (reload and confirm it’s still on).
6. **Pass:** ✓ Weekly digest toggle exists and saves.

*Actual digest delivery is when the `send-weekly-digest` function runs on a schedule – see MANUAL_STEPS.md.*

---

## Test 11: Inactivity nudge (optional – 7+ days)

1. **Do not** open the app for **7+ days** (or temporarily set `last_seen_at` in DB to 8 days ago for your user).
2. Open the app and go to **Dashboard** or **Candidates** (pipeline).
3. **Check:** An in-app notification like **“Welcome back”** / “You haven’t been active for a while…” appears.
4. **Pass:** ✓ Inactivity nudge appears after long absence.

*Often skipped in a single session; note “Skipped – need 7 days gap”.*

---

## Test 12: Job URL filter from “Also in” link

*Do this if you did Test 5.*

1. In a candidate modal, under **“Also in pipeline:”**, click the **job title** link.
2. **Check:** You land on **Candidates** (pipeline) with the **job filter** set to that job (URL like `/candidates?job=<uuid>`).
3. **Pass:** ✓ Link applies the job filter via URL.

---

## Summary

| # | Test | Pass / N/A / Skip |
|---|------|-------------------|
| 1 | Job templates – start from template | |
| 2 | Save as template | |
| 3 | Failed scrape “What to try” | |
| 4 | Monthly scrape limit | |
| 5 | “Also in” (cross-job) | |
| 6 | Skill match tags (green/red) | |
| 7 | One-line AI summary | |
| 8 | Tenure on card + modal | |
| 9 | Post-scrape notification | |
| 10 | Weekly digest toggle | |
| 11 | Inactivity nudge | |
| 12 | Job filter from “Also in” link | |

When you’re done, you can note any failures or N/A reasons next to the test number and we can fix or adjust.
