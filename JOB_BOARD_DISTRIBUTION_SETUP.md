# Job Board Distribution – Setup Guide

When a recruiter **publishes** a job in CoreflowHR, the job can be pushed to **Indeed** and **LinkedIn** (and others later) so it goes live on those platforms without leaving your product. Applications from those boards can be sent back into CoreflowHR via webhooks.

You need to **apply and get approved** as an ATS partner with each platform before you can use their APIs. This is the longest lead-time item; start the process as soon as possible.

---

## 1. Indeed

### What Indeed offers

- **Job Sync API** – Push job listings from CoreflowHR to Indeed.
- **Indeed Apply** – Candidates apply on Indeed; applications can be sent to your system.
- **Partner Console** – Manage apps, credentials, and API access.

### How to apply

1. **Partner docs and console**
   - Documentation: **[docs.indeed.com](https://docs.indeed.com)**  
     (Job Sync API, Indeed Apply, OAuth 2.0, application delivery).
   - Partner Console: **[console.indeed.com](https://console.indeed.com)**  
     Use this to manage applications and credentials **after** you have partner access.

2. **Getting partner/API access**
   - Indeed’s ATS partner program is application-based. Access is not self-serve.
   - **Contact Indeed** to apply for API credentials and partner status:
     - Email: **partners@indeed.com** (or the address current on [Indeed Partner / Hire pages](https://www.indeed.com/hire/recruiting-solutions)).
     - You can also look for an “Indeed for Employers” or “Recruiting solutions” / “Partner” path on [indeed.com/hire](https://www.indeed.com/hire) that leads to partner or API contact.

3. **Filling out the Indeed application form**
   - **Title** – Use a short name for the integration, e.g. `CoreflowHR Indeed Integration` or `CoreflowHR ATS – Indeed`. (This is the application/integration title, not a job title.)
   - **Company / location** – You already have CoreflowHR, US, California, San Francisco, 1 Sansome Street. Adjust if your real address differs.
   - **Integrations to request**
     - **Indeed Apply Sync** – Keep this checked. It’s what lets jobs from CoreflowHR go live on Indeed and lets applications from Indeed flow back into CoreflowHR. Essential for job board distribution.
     - **Candidate Sync** – Consider checking this too. It syncs candidate data from Indeed into your ATS and aligns with “application forwarding” (candidates who apply on Indeed appear in CoreflowHR with source = Indeed).
     - **Disposition Sync** – Optional. Syncs status updates (e.g. rejected, hired) so Indeed’s dashboard stays in sync with your pipeline.
     - **Sponsored Jobs / Indeed Interview / Conversion Tracker** – Leave unchecked unless you have a specific need.
   - **Why are you interested in these integrations?** – You can use:
     - *CoreflowHR is an ATS that helps recruiters manage jobs and candidates in one place. We want recruiters to publish jobs from CoreflowHR directly to Indeed (Indeed Apply Sync) so they don’t have to leave our product, and to receive applications from Indeed into their pipeline with candidate data and source attribution (Candidate Sync). This gives our customers a single workflow while reaching Indeed’s audience.*
   - **Estimated annual job volume** – Give a realistic number. If you’re early-stage, something like `500` or `1,000` is fine; if you have existing customers, estimate total jobs per year across all customers (e.g. `2,000`–`10,000`). They use this for capacity and partnership tiering, not to reject small partners.

4. **What to prepare (general)**
   - Product name and URL (e.g. CoreflowHR, coreflowhr.com).
   - Short description of your ATS and how recruiters use it.
   - Regions/countries you serve.
   - Agreement to their terms and use of their APIs only as documented.

5. **Lead time**
   - Often **several weeks** (e.g. 2–8 weeks) from application to credentials. Start early.

6. **After approval**
   - You’ll get (or be directed to create in Partner Console):
     - **OAuth 2.0** client credentials for authentication.
     - Access to **Job Sync API** (and Indeed Apply / application delivery if included).
   - Use **[docs.indeed.com](https://docs.indeed.com)** for:
     - Job Sync API (post/update jobs).
     - Indeed Apply and application delivery (webhook/URL for applications).
   - Test in any sandbox they provide before going live.

---

## 2. LinkedIn

### What LinkedIn offers

- **Job Posting API** – Post jobs from your ATS to LinkedIn.
- **Apply Connect** – Applications from LinkedIn can be sent to your system.
- **Partner program** – Formal ATS partnership and access to APIs.

### How to apply

1. **Partner application (required)**
   - **Apply here:** **[LinkedIn Talent Solutions – ATS Partners – Partner Application](https://business.linkedin.com/hire/ats-partners/partner-application)**  
   - This is the main way to become an official ATS partner and get API access.

2. **Filling out the LinkedIn application form**
   - **Company HQ\*** – Choose your headquarters region (e.g. North America → United States, or the country where CoreflowHR is registered).
   - **How many customers do you have?\*** – Enter your current number of paying or active ATS customers. If you’re pre-launch or early-stage, use a number you’re comfortable with (e.g. `0` or `1–5`) and focus the narrative on your product and roadmap.
   - **List of 5 largest customers (including link to LinkedIn company page)\*** – If you have 5 customers with LinkedIn company pages, list them with URLs. If you don’t yet have 5, you can write something like: *We are in early stage and do not yet have five enterprise customers with public LinkedIn pages. Our initial customers are [describe: e.g. SMBs, pilot users, or “we are launching soon and building our customer base.”]. We are applying now so that the LinkedIn integration is ready when our customers go live.* (Adjust to your situation; LinkedIn may still consider early-stage ATSs.)
   - **On average, how many daily active jobs do you host on your platform?\*** – Give a realistic number. Early-stage examples: `10`, `25`, `50`. If you have traction: estimate total live jobs across all customers on a typical day (e.g. `100`–`500`). They use this for scale and capacity.
   - **Which system are you interested in integrating with?\*** – Review LinkedIn’s description of LIS (LinkedIn Talent Solutions) integrations for partners, then name the ones you need. At minimum mention: **Job Posting API** (to post jobs from CoreflowHR to LinkedIn) and **Apply Connect** (or the integration that sends LinkedIn applications to your ATS). Use the exact names from their partner docs if they list them.
   - **Describe why you are interested in partnering with LinkedIn.\*** – You can use:
     - *CoreflowHR is an ATS that gives recruiters one place to manage jobs and candidates. We want to partner with LinkedIn so our customers can publish jobs directly from CoreflowHR to LinkedIn and receive applications into their pipeline without leaving our product. LinkedIn’s reach and professional audience are important for our customers’ hiring success, and we want to offer a seamless, integrated experience.*
   - **Describe how offering the integration(s) you selected above will benefit our joint customers.\*** – You can use:
     - *Joint customers will be able to post jobs to LinkedIn from CoreflowHR with one click and see all applicants—whether they apply on our site or on LinkedIn—in a single pipeline with correct source attribution (LinkedIn). That reduces duplicate work, keeps reporting accurate, and lets recruiters spend more time on hiring and less on copying jobs between systems. Offering the integration positions CoreflowHR and LinkedIn as a unified solution for small and mid-size hiring teams.*

3. **Lead time**
   - LinkedIn reports **high volume** and **delayed responses**; they do not guarantee approval for all applicants.
   - Allow **several weeks** (e.g. 2–8 weeks) and follow up if needed.

4. **After approval**
   - You get developer/API access and can use:
     - **Microsoft Learn – LinkedIn Talent Solutions** (Job Posting API, sync job postings, etc.):  
       [learn.microsoft.com/en-us/linkedin/talent/job-postings](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/sync-job-postings)
     - **Apply Connect** (or equivalent) for receiving applications (webhook/URL).
   - Process is often: self-serve access → development & testing (e.g. ~1 month) → certification review → go-live.

---

## 3. What to build in CoreflowHR (after you have credentials)

### For recruiters (publish flow)

- In **Create/Edit Job**, add a **Distribution** section:
  - Checkboxes: **Indeed**, **LinkedIn** (and others later).
  - On **Publish**, CoreflowHR calls each platform’s API with the job data for the boards the recruiter selected.
- Show a **status** per board: e.g. **Posted**, **Pending**, **Failed** (and retry if the API supports it).

### When candidates apply on the board (Indeed / LinkedIn)

- Both platforms support **application forwarding** to a URL you provide.
- You expose a **webhook endpoint** (e.g. `POST /api/webhooks/indeed-applications`, `POST /api/webhooks/linkedin-applications`).
- When an application arrives:
  - Create (or match) the **candidate** in CoreflowHR.
  - Attach **CV/resume** if provided; parse and fill skills/experience as you do for your own application page.
  - Set **source** to “Indeed” or “LinkedIn” for reporting.
  - Place the candidate in the right **job** and **stage** (e.g. Screening).

You’ll use each platform’s docs to map their payload to your candidate and job model.

---

## 4. Checklist

| Step | Action |
|------|--------|
| 1 | **Indeed** – Contact partners@indeed.com (or current partner contact) and/or use [docs.indeed.com](https://docs.indeed.com) and [console.indeed.com](https://console.indeed.com) to find the latest application path. |
| 2 | **LinkedIn** – Submit the [ATS Partner Application](https://business.linkedin.com/talent-solutions/ats-partners/partner-application). |
| 3 | Prepare product description, URL, regions, and volume for both applications. |
| 4 | Wait for approval (plan for 2–8 weeks per platform). |
| 5 | Once approved: create apps/credentials, implement Job Sync (Indeed) and Job Posting API (LinkedIn) for **publish**. |
| 6 | Implement **webhook endpoints** for Indeed and LinkedIn applications; create candidates and set source. |
| 7 | Add **Distribution** UI (checkboxes + status) to job create/edit and wire it to the APIs. |

Start the **Indeed and LinkedIn applications first**; you can design the Distribution UI and webhook contracts in parallel, but you need credentials before you can go live.
