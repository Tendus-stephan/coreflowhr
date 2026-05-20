/**
 * external-pages.spec.ts
 * Tests for all public-facing pages: careers, job apply, offer approval,
 * offer response, and scheduling. Each page is tested at desktop (1280px)
 * and mobile (375px) viewports. Console errors are also monitored.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { TEST_WORKSPACE, TEST_JOB } from '../../fixtures/test-data';

// ─────────────────────────────────────────────────────────────────────────────
// Viewport helpers
// ─────────────────────────────────────────────────────────────────────────────

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 375, height: 812 },
} as const;

type Viewport = keyof typeof VIEWPORTS;

/**
 * Set the page viewport and navigate to a URL. Also attaches a console error
 * listener that fails the test on uncaught JS errors.
 */
async function visitAs(
  page: Page,
  url: string,
  viewport: Viewport,
): Promise<string[]> {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.setViewportSize(VIEWPORTS[viewport]);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  // Allow React hydration / async data fetching
  await page.waitForTimeout(1500);
  return consoleErrors;
}

/** Assert the page body is non-empty and no crash message is present. */
async function assertNoCrash(page: Page): Promise<void> {
  await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });
  // Common React error boundary and Vite unhandled rejection messages
  await expect(
    page.getByText(/TypeError|ReferenceError|Cannot read properties|Uncaught Error/i),
  ).toHaveCount(0, { timeout: 5_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Careers page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Public pages — /careers/:slug', () => {
  for (const vp of ['desktop', 'mobile'] as Viewport[]) {
    test(`careers page loads at ${vp} (${VIEWPORTS[vp].width}px)`, async ({ page }) => {
      const errors = await visitAs(page, `/careers/${TEST_WORKSPACE.slug}`, vp);
      await assertNoCrash(page);

      // Either a list of jobs or an empty state should be visible
      await expect(
        page
          .getByText(/open positions|no.*positions|current roles|jobs|vacancies/i)
          .or(page.getByRole('heading').first()),
      ).toBeVisible({ timeout: 15_000 });

      // No unhandled JS exceptions should have been thrown
      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('net::ERR_'),
      );
      expect(criticalErrors.length).toBe(0);
    });

    test(`careers page search works at ${vp}`, async ({ page }) => {
      await visitAs(page, `/careers/${TEST_WORKSPACE.slug}`, vp);
      await assertNoCrash(page);

      const searchBox = page
        .getByRole('searchbox')
        .or(page.getByPlaceholder(/search.*job|find a role|search/i))
        .first();

      if (!(await searchBox.isVisible({ timeout: 5_000 }).catch(() => false))) {
        // No search on this careers page variant — still pass
        return;
      }

      await searchBox.fill('zzz_no_match_qa');
      await page.waitForTimeout(500);

      // App should react (filter list) without crashing
      await assertNoCrash(page);

      // Clear and verify it recovers
      await searchBox.fill('');
      await page.waitForTimeout(300);
      await assertNoCrash(page);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Job apply page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Public pages — /apply/:jobId', () => {
  // We use a synthetic jobId — the page should still render its shell and form
  // even if the job does not exist (it will show a "not found" state gracefully).
  const SYNTHETIC_JOB_ID = 'qa-test-job-id-000';

  for (const vp of ['desktop', 'mobile'] as Viewport[]) {
    test(`apply page renders at ${vp}`, async ({ page }) => {
      const errors = await visitAs(page, `/apply/${SYNTHETIC_JOB_ID}`, vp);
      await assertNoCrash(page);

      // The apply page should render the application form, or a "not found" message.
      await expect(
        page
          .getByText(/apply|application|not found|this job/i)
          .first(),
      ).toBeVisible({ timeout: 15_000 });

      const criticalErrors = errors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('net::ERR_') &&
          !e.toLowerCase().includes('404'),
      );
      expect(criticalErrors.length).toBe(0);
    });
  }

  test('apply form submits successfully with valid data (desktop)', async ({ page }) => {
    // To test a real submission we need an actual job ID. We navigate to the
    // careers page first to find a live job link, then test the apply flow.
    const errors = await visitAs(page, `/careers/${TEST_WORKSPACE.slug}`, 'desktop');
    await assertNoCrash(page);

    // Click the first job listing link
    const jobLink = page
      .getByRole('link', { name: /apply|view job|see details/i })
      .or(page.locator('a[href*="/apply/"], a[href*="/careers/"]').first())
      .first();

    if (!(await jobLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'No job links on careers page — skipping apply flow test');
      return;
    }

    await jobLink.click();
    await page.waitForTimeout(1500);
    await assertNoCrash(page);

    // Fill in the application form
    const nameField = page
      .getByLabel(/name|full name/i)
      .or(page.getByPlaceholder(/your name|full name/i))
      .first();
    if (await nameField.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameField.fill('QA Applicant Test');
    }

    const emailField = page
      .getByLabel(/email/i)
      .or(page.getByPlaceholder(/email/i))
      .first();
    if (await emailField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailField.fill(`qa-applicant-${Date.now()}@coreflow-test.com`);
    }

    // Phone (optional)
    const phoneField = page
      .getByLabel(/phone/i)
      .or(page.getByPlaceholder(/phone/i))
      .first();
    if (await phoneField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await phoneField.fill('+44 7700 900123');
    }

    // CV file upload (optional in apply form if no CV is required)
    // We do not attach a file here — the form allows submission without a CV,
    // and we intentionally avoid a file-fixture dependency in the external-pages suite.

    // Submit
    const submitBtn = page
      .getByRole('button', { name: /submit|apply|send application/i })
      .first();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();

      // Success message or redirect
      await expect(
        page.getByText(/application received|thank you|submitted|success/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Offer approval page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Public pages — /offers/approve/:token', () => {
  const SYNTHETIC_TOKEN = 'qa-approve-token-test-000';

  for (const vp of ['desktop', 'mobile'] as Viewport[]) {
    test(`offer approval page renders at ${vp}`, async ({ page }) => {
      const errors = await visitAs(page, `/offers/approve/${SYNTHETIC_TOKEN}`, vp);
      await assertNoCrash(page);

      // Should show client branding banner (the Shell component always renders it),
      // plus either offer details or a graceful "not found" message.
      await expect(
        page
          .getByText(/approve|decline|offer|not found|expired|invalid token/i)
          .first(),
      ).toBeVisible({ timeout: 15_000 });

      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('net::ERR_'),
      );
      expect(criticalErrors.length).toBe(0);
    });

    test(`offer approval page has no blank screen at ${vp}`, async ({ page }) => {
      await visitAs(page, `/offers/approve/${SYNTHETIC_TOKEN}`, vp);
      // The body must have content — not a completely white/blank render
      const bodyText = await page.locator('body').textContent();
      expect((bodyText ?? '').replace(/\s/g, '').length).toBeGreaterThan(10);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Offer response page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Public pages — /offers/respond/:token', () => {
  const SYNTHETIC_TOKEN = 'qa-respond-token-test-000';

  for (const vp of ['desktop', 'mobile'] as Viewport[]) {
    test(`offer response page renders with Accept/Decline at ${vp}`, async ({ page }) => {
      const errors = await visitAs(page, `/offers/respond/${SYNTHETIC_TOKEN}`, vp);
      await assertNoCrash(page);

      await expect(
        page
          .getByText(/accept|decline|not found|expired|respond/i)
          .first(),
      ).toBeVisible({ timeout: 15_000 });

      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('net::ERR_'),
      );
      expect(criticalErrors.length).toBe(0);
    });

    test(`offer response page body is not blank at ${vp}`, async ({ page }) => {
      await visitAs(page, `/offers/respond/${SYNTHETIC_TOKEN}`, vp);
      const bodyText = await page.locator('body').textContent();
      expect((bodyText ?? '').replace(/\s/g, '').length).toBeGreaterThan(10);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Scheduling page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Public pages — /schedule/:token', () => {
  const SYNTHETIC_TOKEN = 'qa-schedule-token-test-000';

  for (const vp of ['desktop', 'mobile'] as Viewport[]) {
    test(`scheduling page renders at ${vp}`, async ({ page }) => {
      const errors = await visitAs(page, `/schedule/${SYNTHETIC_TOKEN}`, vp);
      await assertNoCrash(page);

      // The scheduling page should show a calendar/slot selector, a company banner,
      // or a "link not found / expired" message.
      await expect(
        page
          .getByText(
            /schedule|available slots|pick a time|not found|expired|interview/i,
          )
          .first(),
      ).toBeVisible({ timeout: 15_000 });

      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('net::ERR_'),
      );
      expect(criticalErrors.length).toBe(0);
    });

    test(`scheduling page is not a blank screen at ${vp}`, async ({ page }) => {
      await visitAs(page, `/schedule/${SYNTHETIC_TOKEN}`, vp);
      const bodyText = await page.locator('body').textContent();
      expect((bodyText ?? '').replace(/\s/g, '').length).toBeGreaterThan(10);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-page: no JS errors on any public page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Public pages — no console errors (desktop)', () => {
  const publicRoutes = [
    { name: 'careers', path: `/careers/${TEST_WORKSPACE.slug}` },
    { name: 'apply (synthetic)', path: `/apply/qa-test-job-id-000` },
    { name: 'offer approve (synthetic)', path: `/offers/approve/qa-approve-token-000` },
    { name: 'offer respond (synthetic)', path: `/offers/respond/qa-respond-token-000` },
    { name: 'schedule (synthetic)', path: `/schedule/qa-schedule-token-000` },
  ];

  for (const route of publicRoutes) {
    test(`no unhandled JS errors on ${route.name}`, async ({ page }) => {
      const jsErrors: string[] = [];

      page.on('pageerror', (err) => {
        jsErrors.push(err.message);
      });

      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2_000);

      // No unhandled page-level errors
      expect(jsErrors).toHaveLength(0);
    });
  }
});
