# CoreflowHR Test Suite

## Structure

```
tests/
├── unit/              Vitest unit tests — pure functions, no network
├── e2e/               Playwright E2E tests — full browser flows
├── visual/            Playwright visual regression snapshots
├── fixtures/          Shared test data (test-data.ts)
├── helpers/           Shared helpers (auth, api, mail, webhook)
├── setup.ts           Vitest global setup (Supabase mock)
└── *.test.ts          Existing integration/security tests (260 passing)

Also at repo root:
  playwright.config.ts   Playwright configuration
  vitest.config.ts       Vitest configuration
  test-checklist.html    Manual QA checklist (open in browser)
  test-results/          All test output (gitignored)
```

## Running Tests

```bash
# Unit tests only (fast, no browser)
npm run test:unit

# All Vitest tests (unit + integration)
npm run test:run

# E2E headless (Chrome + Firefox + Safari)
npm run test:e2e

# E2E with visible browser (for debugging)
npm run test:e2e:headed

# E2E debug mode (pauses on each step)
npm run test:e2e:debug

# Visual regression (must set CI_VISUAL=1)
CI_VISUAL=1 npm run test:visual

# Update visual baselines after intentional UI changes
CI_VISUAL=1 npm run test:visual:update

# Full suite: unit → E2E
npm run test:all

# Open the last HTML report
npm run test:report
```

## Adding New Tests

### Unit test
1. Create `tests/unit/my-feature.test.ts`
2. Import the function under test from `../../utils/` or `../../services/`
3. Use `describe` + `it` + `expect` from `vitest`
4. Run: `npm run test:unit`

### E2E test
1. Create `tests/e2e/my-flow.spec.ts`
2. Import `{ test, expect }` from `@playwright/test`
3. Import helpers from `../helpers/auth.helper`
4. Import fixture data from `../fixtures/test-data`
5. Run: `npm run test:e2e:headed` to develop interactively

### Visual regression
1. Add a `test` block in `tests/visual/snapshots.spec.ts`
2. Call `await expect(page).toHaveScreenshot('name.png', { maxDiffPixelRatio: 0.02 })`
3. Run `CI_VISUAL=1 npm run test:visual:update` to generate the baseline
4. Commit the `.png` snapshot files in `tests/visual/snapshots/`

## Updating Visual Baselines

After an intentional UI change (e.g. redesign, impeccable pass):

```bash
CI_VISUAL=1 npm run test:visual:update
git add tests/visual/snapshots/
git commit -m "chore: update visual regression baselines"
```

## Debugging a Failing Test

### Unit test failure
```bash
npm run test:unit -- --reporter=verbose
```
Add `console.log` temporarily if needed. Unit tests are fast to iterate on.

### E2E test failure
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector. Step through actions one at a time. Screenshots and videos are saved to `test-results/e2e-artifacts/` on failure.

```bash
npm run test:report
```
Opens the HTML report with screenshots, videos, and traces for every failed test.

### Visual regression failure
A diff image is saved alongside the baseline. Open it to see exactly which pixels changed. If the change is intentional, run `test:visual:update`.

## Interpreting CI Reports

After `npm run test:e2e`, the HTML report is at `test-results/playwright-report/index.html`. In CI it's uploaded as a GitHub Actions artifact (14-day retention).

- **Green** — passed
- **Red** — failed (screenshot + video attached)
- **Amber** — passed on retry (investigate flakiness)

## Environment Variables for E2E

```env
PLAYWRIGHT_BASE_URL=http://localhost:5173
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...       # for test data seeding
TEST_ADMIN_EMAIL=...
TEST_ADMIN_PASSWORD=...
TEST_RECRUITER_EMAIL=...
TEST_RECRUITER_PASSWORD=...
MAILPIT_URL=http://localhost:8025   # for email delivery tests
```

Set locally in `.env.test.local`. In CI, add as GitHub Actions secrets.

## Manual QA Checklist

Open `test-checklist.html` in any browser — no server needed.

- Mark items Pass / Fail / Blocked
- Failures expand a notes field
- Progress bar tracks completion across 6 sections, 73 items
- "Export bug report" generates a plain-text summary of all failures
- State persists in `localStorage` between sessions
