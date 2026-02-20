# HarvestAPI (Apify) – Rounded monthly cost estimate

## Source

- **Actor:** `harvestapi/linkedin-profile-search` (only actor used; 1 attempt per scrape).
- **Provider:** Apify. Cost from your docs: **~$0.25 per compute unit (run)** on paid tier.
- **Plan limits:** Basic 30 scrapes/month, Pro 100 scrapes/month (from `planLimits.ts`).

## Runs per “scrape” (success + failures)

- Each user-triggered scrape can use **1–10 Apify runs** (initial fetch + extra fetches until candidate quota is met).
- **Success:** typically 1–2 runs; sometimes 3–4 if many invalid/duplicates. Assume **~1.5 runs per successful scrape** on average.
- **Failures:** user tries but scrape fails (e.g. quota, network). We still pay for the run(s) before failure. Assume **~1 run per failed attempt** and **~15% of attempts fail**.
- So per scrape “slot” (including failures):  
  **0.85 × 1.5 + 0.15 × 1 ≈ 1.4 runs** (rounded to **~1.5 runs per scrape** for the estimate).

## Rounded monthly cost (Basic and Pro)

| Plan        | Scrapes/month | Est. Apify runs (incl. failures) | At ~$0.25/run | Rounded total/month |
|------------|----------------|----------------------------------|----------------|----------------------|
| **Basic**  | 30             | ~45                              | ~$11           | **~$10–12**          |
| **Pro**    | 100            | ~150                             | ~$38           | **~$35–40**          |

- **Basic:** 30 × 1.5 = 45 runs → **~$10–12/month** scraping cost.
- **Pro:** 100 × 1.5 = 150 runs → **~$35–40/month** scraping cost.

## Does HarvestAPI have a limit per account?

**HarvestAPI (the actor)** does **not** publish a “max scrapes per month” cap. Limits are:

- **Concurrency (HarvestAPI subscription):** how many runs at the same time (Free: 1, Starter: 5, Basic: 10, Pro: 20, Business: 40). Your total monthly volume is only limited by how often you run and how long each run takes.
- **Queue:** up to 10 requests queued per account; above that you get an error until the queue drains.
- **LinkedIn:** if the actor ever relied on a personal LinkedIn account, LinkedIn’s own search quotas would apply; the actor is advertised as “No cookies required,” so this may not apply.

**Apify (the platform)** limits your account by:

- **Free tier:** ~$5 credits/month (no fixed “runs per day”); you can run until credits run out.
- **Paid tier:** your plan’s credits and any usage caps you have.

So in practice: **HarvestAPI does not set a hard “X scrapes per account per month.”** You’re limited by (1) Apify credits/plan, (2) HarvestAPI concurrency and queue if you run many jobs at once. For 30–100 scrapes/month spread over the month, concurrency is unlikely to be the bottleneck.

## Multiple users scraping at once

If several users click "Scrape" at the same time, you can hit HarvestAPI's **concurrency** (e.g. 1 on free, 5–10 on Starter/Basic) and get errors or queue full.

**What we did in the app:**

1. **Concurrency cap** – A DB-backed limit (table `scrape_active` + `acquire_scrape_slot()`) allows only **3 scrapes at a time** (configurable in the migration). If a 4th user triggers a scrape, they get: *"Another scrape is in progress. Please try again in a minute."* (HTTP 429). Run the migration `add_scrape_concurrency_limit.sql` and redeploy the `scrape-candidates` Edge Function so this is active.
2. **Tune the cap** – In the migration, change `max_slots` (e.g. to 1 for HarvestAPI free, 5 for Starter, 10 for Basic) so it never exceeds your HarvestAPI plan's concurrent requests.
3. **Upgrade HarvestAPI** – For more simultaneous users without queueing, use a plan with higher concurrency (e.g. Basic 10, Pro 20, Business 40).

**Options:**

- **Queue only (current):** Keep max 3 (or 1) concurrent; extra users see 429 and retry. No change to HarvestAPI plan.
- **Higher concurrency:** Increase `max_slots` in the migration and upgrade your HarvestAPI plan so N concurrent scrapes stay under their limit.

## Assumptions

- Apify paid tier **~$0.25 per run**.
- **harvestapi** only (no fallback actors); 1 run per `actor.call()`.
- Average **1.5 runs per scrape** (success + extra fetches).
- **~15% of attempts** are failures that still use ~1 run each.
- No other scraping providers or fixed monthly fees included.

## Am I at a loss?

- Compare these numbers to **what you charge** per plan (e.g. Basic $X, Pro $Y).
- If **plan price > rounded estimate** for that plan, scraping alone doesn’t put you at a loss for that tier.
- If **plan price < estimate**, you’re subsidizing scraping for that plan (or need to raise price, lower scrape limit, or reduce runs per scrape).

**Last updated:** 2026-01-21
