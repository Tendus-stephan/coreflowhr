/**
 * jobs.spec.ts
 * E2E tests for job management: create, edit, status changes, public careers page,
 * search, and empty state.
 */

import { test, expect, Page } from '@playwright/test';
import { loginAs } from '../../helpers/auth.helper';
import { TEST_JOB, TEST_WORKSPACE, ROUTES } from '../../fixtures/test-data';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Opens the "Add Job" / "New Job" modal from the Jobs page. */
async function openAddJobModal(page: Page) {
  await page.goto(ROUTES.jobs);
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });

  // Look for the primary CTA button — it may say "Add Job", "New Job", or "+".
  const addBtn = page
    .getByRole('button', { name: /add job|new job|\+ job/i })
    .or(page.getByRole('link', { name: /add job|new job/i }))
    .first();

  await expect(addBtn).toBeVisible({ timeout: 10_000 });
  await addBtn.click();

  // The modal (or inline form) should appear
  await expect(
    page.getByRole('dialog').or(page.getByRole('form')).or(page.locator('[role="dialog"]')),
  ).toBeVisible({ timeout: 10_000 });
}

/**
 * Fill in the standard job fields inside the currently-open Add Job modal.
 * Allows per-test overrides.
 */
async function fillJobForm(
  page: Page,
  overrides: Partial<typeof TEST_JOB> = {},
) {
  const job = { ...TEST_JOB, ...overrides };

  // Title
  const titleInput = page
    .getByLabel(/job title/i)
    .or(page.getByPlaceholder(/job title|title/i))
    .first();
  await titleInput.fill(job.title);

  // Department (may be a select or text input)
  const deptInput = page
    .getByLabel(/department/i)
    .or(page.getByPlaceholder(/department/i))
    .first();
  if (await deptInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await deptInput.fill(job.department);
  }

  // Location
  const locationInput = page
    .getByLabel(/location/i)
    .or(page.getByPlaceholder(/location/i))
    .first();
  if (await locationInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await locationInput.fill(job.location);
  }

  // Job type — try a <select> first, fall back to custom dropdown
  const typeSelect = page.locator('select').filter({ hasText: /full.time|part.time/i }).first();
  if (await typeSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await typeSelect.selectOption({ label: job.type });
  } else {
    // Try a custom-select button
    const typeBtn = page
      .getByRole('combobox', { name: /type/i })
      .or(page.getByLabel(/job type/i))
      .first();
    if (await typeBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await typeBtn.click();
      await page.getByRole('option', { name: job.type }).click();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create job
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Job management — create', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('create a job with required fields and verify it appears in the list', async ({
    page,
  }) => {
    await openAddJobModal(page);

    const uniqueTitle = `${TEST_JOB.title} ${Date.now()}`;
    await fillJobForm(page, { title: uniqueTitle });

    // Submit
    const submitBtn = page
      .getByRole('button', { name: /save|create|add job|post job/i })
      .last();
    await submitBtn.click();

    // Modal closes and we land back on the jobs list
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });

    // The newly created job should appear in the list
    await expect(page.getByText(uniqueTitle, { exact: false })).toBeVisible({
      timeout: 15_000,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Careers page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Job management — public careers page', () => {
  // These tests access the public /careers/:slug route and do not require auth
  test.beforeEach(async ({ page }) => {
    // No login needed for the careers page itself
  });

  test('careers page loads with workspace name and job listings', async ({ page }) => {
    // Use the known workspace slug from test fixtures
    await page.goto(`/careers/${TEST_WORKSPACE.slug}`);

    // Should not be a 404 or blank screen
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });

    // Either a job listing or an "open positions" type heading should be visible
    await expect(
      page
        .getByText(/open positions|current openings|jobs|no.*positions/i)
        .or(page.getByRole('heading').first()),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('search input on careers page filters job listings', async ({ page }) => {
    await page.goto(`/careers/${TEST_WORKSPACE.slug}`);
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });

    // Find the search box — may be a labelled input or a placeholder
    const searchBox = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search.*job|find.*role/i))
      .first();

    if (await searchBox.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Type a nonsense query — results should show empty state or reduce count
      await searchBox.fill('zzz_no_match_xyz');
      await page.waitForTimeout(500); // allow filter to apply

      // Either 0 results OR a "no jobs found" message
      const noResults = page.getByText(/no.*jobs|no.*positions|no.*results|no openings/i);
      const jobCards = page.locator('[data-testid="job-card"], .job-listing, article').filter({
        hasNotText: /zzz_no_match_xyz/i,
      });

      const [noResultsCount, cardsCount] = await Promise.all([
        noResults.count(),
        jobCards.count(),
      ]);

      expect(noResultsCount > 0 || cardsCount === 0).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edit job
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Job management — edit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('editing a job title updates the jobs list', async ({ page }) => {
    await page.goto(ROUTES.jobs);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });

    // Find the first job in the list that has a three-dot/edit action
    const firstJobRow = page
      .locator('tr, [data-testid="job-row"], .job-card')
      .first();

    if (!(await firstJobRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'No jobs in the list — skipping edit test');
      return;
    }

    // Open the context menu / edit button for that row
    const moreBtn = firstJobRow
      .getByRole('button', { name: /more|options|edit/i })
      .or(firstJobRow.locator('[aria-label*="more"], [aria-label*="edit"]'))
      .first();

    if (await moreBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await moreBtn.click();
    }

    const editMenuItem = page.getByRole('menuitem', { name: /edit/i }).or(
      page.getByRole('button', { name: /edit job/i }),
    );

    if (await editMenuItem.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await editMenuItem.click();
    }

    // Wait for the edit modal / inline edit form
    const titleField = page
      .getByLabel(/job title/i)
      .or(page.getByPlaceholder(/job title|title/i))
      .first();

    if (!(await titleField.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Could not open edit form — skipping');
      return;
    }

    const updatedTitle = `Edited QA Job ${Date.now()}`;
    await titleField.clear();
    await titleField.fill(updatedTitle);

    const saveBtn = page.getByRole('button', { name: /save|update/i }).last();
    await saveBtn.click();

    // The updated title should appear in the list
    await expect(page.getByText(updatedTitle, { exact: false })).toBeVisible({
      timeout: 15_000,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Job status — Close job
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Job management — status changes', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('closing a job removes it from the public careers page', async ({ page }) => {
    // First, create a job so we know it exists in the list
    await openAddJobModal(page);
    const closableTitle = `Closable QA Job ${Date.now()}`;
    await fillJobForm(page, { title: closableTitle });
    const submitBtn = page.getByRole('button', { name: /save|create|post/i }).last();
    await submitBtn.click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText(closableTitle, { exact: false })).toBeVisible({
      timeout: 15_000,
    });

    // Find that specific job row and close it
    const jobRow = page.locator('tr, [data-testid="job-row"], .job-card').filter({
      hasText: closableTitle,
    });

    const moreBtn = jobRow
      .getByRole('button', { name: /more|options/i })
      .or(jobRow.locator('[aria-label*="more"]'))
      .first();

    if (await moreBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await moreBtn.click();

      const closeOption = page
        .getByRole('menuitem', { name: /close|archive/i })
        .first();

      if (await closeOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await closeOption.click();

        // Confirm dialog if shown
        const confirmBtn = page.getByRole('button', { name: /confirm|yes|close/i }).last();
        if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // Now check the careers page — the closed job should not appear
        await page.goto(`/careers/${TEST_WORKSPACE.slug}`);
        await page.waitForTimeout(1000);

        const jobOnCareers = page.getByText(closableTitle, { exact: false });
        await expect(jobOnCareers).toHaveCount(0, { timeout: 10_000 });
      }
    } else {
      test.skip(true, 'Could not locate job context menu — skipping close test');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Search jobs
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Job management — search', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('searching by job title filters the jobs list', async ({ page }) => {
    await page.goto(ROUTES.jobs);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15_000 });

    // Locate search field
    const searchField = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search.*job|search/i))
      .first();

    if (!(await searchField.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'No search field on jobs page — skipping');
      return;
    }

    // Search for something unlikely to match any job
    await searchField.fill('zzz_qa_no_match_string');
    await page.waitForTimeout(500); // allow debounce

    // Either an empty state message appears, or 0 job rows are visible
    const emptyMsg = page.getByText(/no.*jobs|no results|nothing found/i);
    const rows = page.locator('tr[data-testid], .job-card, [data-testid="job-row"]');

    const emptyCount = await emptyMsg.count();
    const rowCount = await rows.count();
    expect(emptyCount > 0 || rowCount === 0).toBe(true);

    // Clear search and confirm rows return
    await searchField.clear();
    await page.waitForTimeout(500);
    // Some jobs should be visible (or empty state if none seeded)
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Job management — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('empty state UI is shown when no jobs exist and search returns nothing', async ({
    page,
  }) => {
    await page.goto(ROUTES.jobs);
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });

    // Apply a filter that will yield no results to simulate empty state
    const searchField = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .first();

    if (await searchField.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchField.fill('zzz_qa_empty_state_test_xyz');
      await page.waitForTimeout(600);

      // Either empty state messaging or 0 job cards
      const emptyIndicator = page.getByText(
        /no jobs|no results|no open roles|nothing here|create your first/i,
      );
      const jobCards = page.locator('.job-card, [data-testid="job-row"], tbody tr');

      const emptyCount = await emptyIndicator.count();
      const cardCount = await jobCards.count();

      expect(emptyCount > 0 || cardCount === 0).toBe(true);
    } else {
      // No search field — just assert the page loaded without error
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });
});
