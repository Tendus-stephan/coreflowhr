# Candidate enrichment and job-seeking signals – plan

This document outlines how we surface **tenure/job-seeking signals** today and a plan for **external enrichment APIs** later.

## Current behaviour (in-app)

- **Tenure / experience**: Shown on pipeline cards and in the candidate modal using:
  - `candidate.experience` (years) when set (e.g. from scraper or CV parse).
  - Otherwise `candidate.workExperience[0]` (period + company) when available.
- **Job-seeking signals**: The scraper can detect signals (e.g. “Open to work”, short tenure, career gaps) in `scraper/src/utils/jobSeekingSignals.ts`. These are not yet stored per candidate in the DB or shown in the UI. Storing them would require a migration (e.g. `job_seeking_signals JSONB` or booleans) and mapping in the API/UI.

## Possible external enrichment sources

| Source | Use case | Notes |
|--------|----------|--------|
| **LinkedIn (official API or partner)** | Profile completeness, “Open to work”, tenure, current role | Requires partnership or official API access; ToS limits scraping. |
| **Clearbit (or similar)** | Enrichment by email/domain: company, role, seniority | Good for direct applicants with email; rate limits and cost. |
| **Hunter / Apollo / Lusha** | Email/phone discovery, job title, company | Useful for outreach; pricing and compliance (GDPR, etc.) to consider. |
| **Internal only (CV + scraper)** | Tenure, skills, work history, education | Already in use; no extra cost; no new integrations. |

## Recommended next steps

1. **Short term**: Keep showing tenure (and optional one-line summary) from existing `workExperience` / `experience` and AI analysis. No new APIs.
2. **Optional DB**: Add a `job_seeking_signals` (or similar) column and populate it from the scraper’s `jobSeekingSignals` when we scrape, then show a small “Open to work” / “Possible job seeker” badge in the UI.
3. **Later**: If we add enrichment (e.g. Clearbit, Apollo), add an `enrichment` JSONB column and a small “Enrich” action that calls the provider and merges result into candidate or into a side panel.

No new external APIs are required for the current tenure and job-seeking display; the above is a plan for future enrichment and storage of job-seeking signals.
