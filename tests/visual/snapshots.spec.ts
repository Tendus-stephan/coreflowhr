/**
 * snapshots.spec.ts
 * Visual regression tests using Playwright's toHaveScreenshot().
 *
 * These tests are skipped unless the environment variable CI_VISUAL=1 is set.
 * Run them with:
 *   CI_VISUAL=1 npx playwright test tests/visual/snapshots.spec.ts
 *
 * On the first run (baseline generation), use --update-snapshots:
 *   CI_VISUAL=1 npx playwright test tests/visual/snapshots.spec.ts --update-snapshots
 */

import { test, expect, Page } from '@playwright/test';
import { loginAs } from '../../helpers/auth.helper';
import { TEST_WORKSPACE, ROUTES } from '../../fixtures/test-data';

// ─────────────────────────────────────────────────────────────────────────────
// Guard: skip the entire suite unless CI_VISUAL is explicitly enabled
// ─────────────────────────────────────────────────────────────────────────────
test.beforeEach(async ({}, testInfo) => {
  if (!process.env.CI_VISUAL) {
    testInfo.skip();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Viewport helpers
// ─────────────────────────────────────────────────────────────────────────────

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 375, height: 812 };

const SCREENSHOT_OPTIONS = {
  maxDiffPixelRatio: 0.02, // allow up to 2% pixel difference before failing
  animations: 'disabled',  // freeze CSS animations for stable screenshots
} as const;

/**
 * Set viewport, navigate to url, wait for content to stabilise, and take
 * a named screenshot.
 */
async function snapPage(
  page: Page,
  url: string,
  name: string,
  viewport: { width: number; height: number } = DESKTOP,
) {
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: 'networkidle' });
  // Extra settle time for animations / skeleton loaders to finish
  await page.waitForTimeout(1_500);
  await expect(page).toHaveScreenshot(name, SCREENSHOT_OPTIONS);
}

// ─────────────────────────────────────────────────────────────────────────────
// /login
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual — /login', () => {
  test('login page at 1280px', async ({ page }) => {
    await snapPage(page, ROUTES.login, 'login-desktop.png', DESKTOP);
  });

  test('login page at 375px', async ({ page }) => {
    await snapPage(page, ROUTES.login, 'login-mobile.png', MOBILE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /signup
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual — /signup', () => {
  test('signup page at 1280px', async ({ page }) => {
    await snapPage(page, ROUTES.signup, 'signup-desktop.png', DESKTOP);
  });

  test('signup page at 375px', async ({ page }) => {
    await snapPage(page, ROUTES.signup, 'signup-mobile.png', MOBILE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /dashboard
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual — /dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('dashboard at 1280px', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(ROUTES.dashboard, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_000);
    await expect(page).toHaveScreenshot('dashboard-desktop.png', SCREENSHOT_OPTIONS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /jobs — with jobs and without jobs
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual — /jobs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('jobs page at 1280px (existing state)', async ({ page }) => {
    // Capture the current state of the jobs page (may or may not have jobs)
    await page.setViewportSize(DESKTOP);
    await page.goto(ROUTES.jobs, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_000);
    await expect(page).toHaveScreenshot('jobs-desktop.png', SCREENSHOT_OPTIONS);
  });

  test('jobs page at 1280px — empty state via search filter', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(ROUTES.jobs, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1_500);

    // Apply a nonsense search to trigger empty state
    const searchField = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .first();

    if (await searchField.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await searchField.fill('zzz_qa_visual_empty_state');
      await page.waitForTimeout(600);
    }

    await expect(page).toHaveScreenshot('jobs-desktop-empty.png', SCREENSHOT_OPTIONS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /candidates — kanban view
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual — /candidates', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('candidates kanban view at 1280px', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(ROUTES.candidates, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_500); // allow data + skeleton to settle

    // Ensure kanban view is active (in case list view was left from a previous test)
    const kanbanBtn = page
      .getByRole('button', { name: /kanban|board|grid/i })
      .or(page.locator('[aria-label*="kanban"], [aria-label*="grid"]'))
      .first();
    if (await kanbanBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await kanbanBtn.click();
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveScreenshot('candidates-kanban-desktop.png', SCREENSHOT_OPTIONS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /clients
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual — /clients', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('clients page at 1280px', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(ROUTES.clients, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_000);
    await expect(page).toHaveScreenshot('clients-desktop.png', SCREENSHOT_OPTIONS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /offers
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual — /offers', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('offers page at 1280px', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(ROUTES.offers, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_000);
    await expect(page).toHaveScreenshot('offers-desktop.png', SCREENSHOT_OPTIONS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /settings
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual — /settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('settings page at 1280px', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto(ROUTES.settings, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2_000);
    await expect(page).toHaveScreenshot('settings-desktop.png', SCREENSHOT_OPTIONS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Public /careers/:slug
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual — public /careers/:slug', () => {
  test('careers page at 1280px', async ({ page }) => {
    await snapPage(
      page,
      `/careers/${TEST_WORKSPACE.slug}`,
      'careers-desktop.png',
      DESKTOP,
    );
  });

  test('careers page at 375px', async ({ page }) => {
    await snapPage(
      page,
      `/careers/${TEST_WORKSPACE.slug}`,
      'careers-mobile.png',
      MOBILE,
    );
  });
});
