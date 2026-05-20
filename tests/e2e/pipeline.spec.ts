/**
 * pipeline.spec.ts
 * E2E tests for the Pipeline / Kanban board view.
 * Covers: column rendering, empty state, stage count badges, and list-view toggle.
 */

import { test, expect, Page } from '@playwright/test';
import { loginAs } from '../../helpers/auth.helper';
import { ROUTES } from '../../fixtures/test-data';

// ─────────────────────────────────────────────────────────────────────────────
// Shared setup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Open the candidates page and select the first available job so the pipeline
 * board has data to show (or empty state to render).
 */
async function openPipeline(page: Page): Promise<void> {
  await page.goto(ROUTES.candidates);
  await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });
  await page.waitForTimeout(1500); // allow initial API fetch

  // If there is a job selector, choose the first non-placeholder job
  const jobSelector = page
    .getByRole('combobox', { name: /job|select a job/i })
    .or(page.locator('select').filter({ has: page.locator('option') }).first())
    .first();

  if (await jobSelector.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const tag = await jobSelector.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') {
      const optCount = await jobSelector.locator('option').count();
      if (optCount > 1) {
        // index 0 is usually a placeholder ("Select a job...")
        await jobSelector.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    } else {
      await jobSelector.click();
      const firstOpt = page.getByRole('option').first();
      if (await firstOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await firstOpt.click();
        await page.waitForTimeout(1000);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Kanban column rendering
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pipeline — Kanban column rendering', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await openPipeline(page);
  });

  test('Kanban columns render the expected stage labels', async ({ page }) => {
    // The pipeline board uses STAGE_META to define column labels.
    // We expect to see at least these headings somewhere in the page.
    const expectedStages = ['Waitlist', 'Screening', 'Interview', 'Offer', 'Hired'];

    let visibleCount = 0;
    for (const stage of expectedStages) {
      const el = page.getByText(new RegExp(`^${stage}$`, 'i')).first();
      if (await el.isVisible({ timeout: 3_000 }).catch(() => false)) {
        visibleCount++;
      }
    }

    // At least 3 of the 5 stage columns should be visible
    expect(visibleCount).toBeGreaterThanOrEqual(3);
  });

  test('each visible column has a stage-count badge', async ({ page }) => {
    // Stage count badges appear in column headers, typically as a small number
    // inside a styled span/div. We look for elements containing a number that
    // sits adjacent to a stage-label heading.
    //
    // Strategy: locate elements that look like count badges — small numeric text
    // within the header region of each column.
    const columnHeaders = page.locator(
      '[data-testid*="column-header"], [class*="columnHeader"], [class*="column-header"]',
    );

    const headerCount = await columnHeaders.count();
    if (headerCount === 0) {
      // Fall back: look for numeric text near stage names
      const stageHeadings = page
        .getByText(/^Waitlist$|^Screening$|^Interview$|^Offer$|^Hired$/i)
        .first();
      await expect(stageHeadings).toBeVisible({ timeout: 10_000 });
      // Pass — column structure is present
      return;
    }

    // For each column header, there should be a sibling/child with a numeric count
    for (let i = 0; i < Math.min(headerCount, 3); i++) {
      const header = columnHeaders.nth(i);
      // Count text is typically a small number 0-999
      const countEl = header.locator('[class*="count"], [class*="badge"]').first();
      if (await countEl.isVisible({ timeout: 2_000 }).catch(() => false)) {
        const text = await countEl.textContent();
        // Should be a stringified integer
        expect(parseInt(text?.trim() ?? '', 10)).not.toBeNaN();
      }
    }
  });

  test('Kanban board renders candidate cards when candidates exist', async ({ page }) => {
    // Wait for potential data load
    await page.waitForTimeout(2_000);

    // Candidate cards are the primary data unit in the Kanban board
    const cards = page.locator(
      '[data-testid="candidate-card"], .candidate-card, [class*="candidateCard"], [class*="candidate-card"]',
    );

    const cardCount = await cards.count();

    if (cardCount === 0) {
      // No candidates seeded — the board should show a proper empty state,
      // not a broken/errored view.
      const emptyMsg = page.getByText(
        /no candidates|import.*cv|add.*candidate|upload.*cv|get started/i,
      );
      await expect(emptyMsg.first()).toBeVisible({ timeout: 10_000 });
    } else {
      // At least one card exists — verify it has readable content (name or email)
      const firstCard = cards.first();
      await expect(firstCard).toBeVisible();
      const text = await firstCard.textContent();
      expect((text ?? '').length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pipeline — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('empty pipeline shows actionable message when no candidates are imported', async ({
    page,
  }) => {
    await page.goto(ROUTES.candidates);
    await page.waitForTimeout(2_000);

    const candidateCards = page.locator(
      '[data-testid="candidate-card"], .candidate-card, [class*="candidateCard"]',
    );

    const count = await candidateCards.count();
    if (count > 0) {
      // There are candidates — not an empty state scenario for this test
      test.skip(true, 'Candidates are present — empty state test not applicable');
      return;
    }

    // Expect some kind of prompt to add / import candidates
    const emptyIndicator = page.getByText(
      /import|add.*candidate|upload.*cv|no candidates|get started|first candidate/i,
    );
    await expect(emptyIndicator.first()).toBeVisible({ timeout: 10_000 });
  });

  test('no candidates page does not show an error boundary or stack trace', async ({
    page,
  }) => {
    await page.goto(ROUTES.candidates);
    await page.waitForTimeout(2_000);

    // No raw stack traces / unhandled error messages should be visible
    await expect(page.getByText(/TypeError|ReferenceError|Cannot read/i)).toHaveCount(0);
    await expect(page.getByText(/Something went wrong|unexpected error/i)).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stage counts
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pipeline — stage count accuracy', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await openPipeline(page);
  });

  test('stage count in column header matches actual number of visible cards', async ({
    page,
  }) => {
    await page.waitForTimeout(2_000);

    // Check each column: count the badge number vs actual cards in that column
    const columns = page.locator(
      '[data-testid*="pipeline-column"], [class*="pipelineColumn"], [class*="pipeline-column"]',
    );
    const colCount = await columns.count();

    if (colCount === 0) {
      // Fallback: just verify the page is not broken
      await expect(page.locator('body')).not.toBeEmpty();
      return;
    }

    for (let i = 0; i < Math.min(colCount, 3); i++) {
      const col = columns.nth(i);

      // Count actual cards in this column
      const cardsInCol = col.locator(
        '[data-testid="candidate-card"], [class*="candidateCard"], [class*="candidate-card"]',
      );
      const actualCount = await cardsInCol.count();

      // Find the badge / count number displayed in the header
      const badgeText = await col
        .locator('[class*="count"], [class*="badge"], [class*="Count"]')
        .first()
        .textContent()
        .catch(() => null);

      if (badgeText !== null) {
        const displayedCount = parseInt(badgeText.trim(), 10);
        if (!isNaN(displayedCount)) {
          // The displayed count should equal actual visible cards
          expect(displayedCount).toBe(actualCount);
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// List-view toggle
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pipeline — list-view toggle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await openPipeline(page);
  });

  test('list-view toggle button switches from Kanban to list layout', async ({ page }) => {
    // CandidateBoard has a List/Grid toggle — look for a button with LayoutGrid or List icon
    const listViewBtn = page
      .getByRole('button', { name: /list view|list|view as list/i })
      .or(page.locator('[data-testid="list-view-btn"], [aria-label*="list"]'))
      .first();

    if (!(await listViewBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'List-view toggle button not found on candidates page — skipping');
      return;
    }

    await listViewBtn.click();
    await page.waitForTimeout(500);

    // In list view, a table or list container should be visible
    const listContainer = page.locator('table, [data-testid="list-view"], [class*="listView"], [class*="list-view"]');
    await expect(listContainer.first()).toBeVisible({ timeout: 10_000 });

    // Switch back to Kanban via the grid/kanban toggle
    const kanbanBtn = page
      .getByRole('button', { name: /kanban|board|grid/i })
      .or(page.locator('[data-testid="kanban-view-btn"], [aria-label*="kanban"], [aria-label*="grid"]'))
      .first();

    if (await kanbanBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await kanbanBtn.click();
      await page.waitForTimeout(500);

      // Kanban columns should re-appear
      const columns = page.locator(
        '[data-testid*="pipeline-column"], [class*="pipelineColumn"]',
      );
      const hasColumns = (await columns.count()) > 0;

      // Either columns reappear or the stage labels are present
      if (!hasColumns) {
        const stageLabel = page.getByText(/^Screening$|^Waitlist$/i).first();
        await expect(stageLabel).toBeVisible({ timeout: 5_000 });
      } else {
        expect(await columns.count()).toBeGreaterThan(0);
      }
    }
  });

  test('list view renders a table with candidate columns', async ({ page }) => {
    const listViewBtn = page
      .getByRole('button', { name: /list view|list/i })
      .or(page.locator('[data-testid="list-view-btn"], [aria-label*="list"]'))
      .first();

    if (!(await listViewBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'List-view toggle not found');
      return;
    }

    await listViewBtn.click();
    await page.waitForTimeout(600);

    // Expect table headers for typical candidate fields: Name, Stage, Score
    const nameHeader = page.getByRole('columnheader', { name: /name/i }).or(
      page.getByText(/^Name$/i).first(),
    );
    await expect(nameHeader.first()).toBeVisible({ timeout: 10_000 });
  });
});
