# Plan Privileges & Sourcing Limits

## Overview

Each subscription plan has different limits on candidate sourcing, active jobs, and features. This document outlines the privileges for each plan.

## Plan Tiers

### 💼 Basic Plan
**Price:** $39/month (monthly) or $33/month (yearly)

**Sourcing Limits:**
- **Candidates per Job:** 50
- **Active Jobs:** 5
- **Candidates per Month:** 500
- **Sourcing Sources:** LinkedIn, GitHub

**Features:**
- ✅ Up to 5 active jobs
- ✅ Up to 50 candidates per job
- ✅ Up to 500 candidates per month
- ✅ LinkedIn + GitHub sourcing
- ✅ AI-powered candidate matching
- ✅ Email templates
- ✅ Basic analytics
- ✅ Email support

**Best For:** Growing teams, regular hiring, small to medium businesses

---

### 🚀 Professional Plan
**Price:** $99/month (monthly) or $83/month (yearly)

**Sourcing Limits:**
- **Candidates per Job:** Unlimited
- **Active Jobs:** Unlimited
- **Candidates per Month:** Unlimited
- **Sourcing Sources:** All sources (LinkedIn, GitHub, MightyRecruiter, JobSpider)

**Features:**
- ✅ Unlimited active jobs
- ✅ Unlimited candidates per job
- ✅ Unlimited candidates per month
- ✅ All sourcing sources (LinkedIn, GitHub, MightyRecruiter, JobSpider)
- ✅ Advanced AI matching
- ✅ Custom email templates
- ✅ Advanced analytics & reports
- ✅ Team collaboration
- ✅ Priority support
- ✅ API access

**Best For:** Large teams, agencies, high-volume hiring, enterprise

---

## Sourcing Sources by Plan

| Source | Basic | Professional |
|--------|-------|--------------|
| LinkedIn | ✅ | ✅ |
| GitHub | ✅ | ✅ |
| MightyRecruiter | ❌ | ✅ |
| JobSpider | ❌ | ✅ |

---

## Feature Comparison

| Feature | Basic | Professional |
|---------|-------|--------------|
| Active Jobs | 5 | Unlimited |
| Candidates per Job | 50 | Unlimited |
| Candidates per Month | 500 | Unlimited |
| AI Analysis | ✅ | ✅ |
| Advanced Analytics | ❌ | ✅ |
| Team Collaboration | ❌ | ✅ |
| Priority Support | ❌ | ✅ |
| Custom Email Templates | ❌ | ✅ |
| API Access | ❌ | ✅ |

---

## Implementation Details

### Plan Limits Enforcement

Plan limits are enforced in the following areas:

1. **AddJob.tsx** - Checks plan limits before sourcing candidates
2. **ScrapingService** - Uses plan-allowed sources only
3. **Database** - Tracks candidate counts per job and per month

### How Limits Work

- **Per Job Limit:** Maximum candidates that can be sourced for a single job posting
- **Monthly Limit:** Total candidates sourced across all jobs in a calendar month
- **Source Restrictions:** Only allowed sources are used for scraping

### Upgrade Path

Users can upgrade their plan at any time:
- Basic → Professional: $99/month (prorated)

Upgrading immediately unlocks new limits and features.

---

## Usage Examples

### Basic Plan User
- Posts 3 jobs
- Sources 50 candidates per job (LinkedIn + GitHub)
- Can post 2 more jobs
- Monthly limit: 500 candidates total

### Professional Plan User
- Posts unlimited jobs
- Sources unlimited candidates per job
- Uses all available sources
- No monthly limits

---

## Notes

- Limits reset monthly (on the 1st of each month)
- Unused candidates don't roll over
- Plan upgrades take effect immediately
- Plan downgrades take effect at the end of the billing period

