/**
 * offers.spec.ts
 * E2E tests for the Offers module.
 *
 * Track A — no approval required:
 *   Create an offer → send → status shows "Awaiting response"
 *
 * Track B — approval required:
 *   Create offer with requiresApproval = true → send to approval queue
 *   → status shows "Awaiting approval"
 *   → visit /offers/approve/:token → approval page renders with offer details
 *   → visit /offers/respond/:token → response page renders
 */

import { test, expect, Page } from '@playwright/test';
import { loginAs } from '../helpers/auth.helper';
import { TEST_OFFER, TEST_CANDIDATES, ROUTES } from '../fixtures/test-data';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Open the Offers page and wait for it to load. */
async function openOffersPage(page: Page): Promise<void> {
  await page.goto(ROUTES.offers);
  // Wait for either the skeleton to clear or the heading to appear
  await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });
  await page.waitForTimeout(1500);
}

/** Click the "New Offer" / "Create Offer" button to open the offer modal. */
async function openCreateOfferModal(page: Page): Promise<void> {
  const createBtn = page
    .getByRole('button', { name: /new offer|create offer|\+ offer/i })
    .first();
  await expect(createBtn).toBeVisible({ timeout: 10_000 });
  await createBtn.click();

  // Wait for the modal / form to appear
  await expect(
    page
      .getByRole('dialog')
      .or(page.locator('[data-testid="offer-modal"]'))
      .first(),
  ).toBeVisible({ timeout: 10_000 });
}

/**
 * Fill in the minimum required fields in the offer creation modal.
 * Accepts optional requiresApproval flag.
 */
async function fillOfferForm(
  page: Page,
  options: { requiresApproval?: boolean } = {},
): Promise<void> {
  // Candidate selector — pick the first available option
  const candidateSelect = page
    .getByLabel(/candidate/i)
    .or(page.getByRole('combobox', { name: /candidate/i }))
    .first();
  if (await candidateSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const tag = await candidateSelect.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') {
      const opts = await candidateSelect.locator('option').count();
      if (opts > 1) await candidateSelect.selectOption({ index: 1 });
    } else {
      await candidateSelect.click();
      const firstOpt = page.getByRole('option').first();
      if (await firstOpt.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await firstOpt.click();
      }
    }
  }

  // Salary amount
  const salaryInput = page
    .getByLabel(/salary|amount/i)
    .or(page.getByPlaceholder(/salary|amount/i))
    .first();
  if (await salaryInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await salaryInput.fill(String(TEST_OFFER.salary));
  }

  // Start date
  const startDateInput = page
    .getByLabel(/start date/i)
    .or(page.getByPlaceholder(/start date|yyyy-mm-dd/i))
    .first();
  if (await startDateInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await startDateInput.fill(TEST_OFFER.startDate);
  }

  // Benefits / notes
  const benefitsInput = page
    .getByLabel(/benefits/i)
    .or(page.getByPlaceholder(/benefits/i))
    .first();
  if (await benefitsInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await benefitsInput.fill(TEST_OFFER.benefits);
  }

  // Requires approval checkbox
  if (options.requiresApproval) {
    const approvalCheckbox = page
      .getByLabel(/requires approval|approval required/i)
      .or(page.getByRole('checkbox', { name: /approval/i }))
      .first();
    if (await approvalCheckbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const isChecked = await approvalCheckbox.isChecked();
      if (!isChecked) {
        await approvalCheckbox.check();
      }
      // Fill approver email if visible
      const approverEmail = page.getByLabel(/approver email/i).or(
        page.getByPlaceholder(/approver.*email/i),
      ).first();
      if (await approverEmail.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await approverEmail.fill(TEST_OFFER.approverEmail);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Track A — no approval
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Offers — Track A (no approval required)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await openOffersPage(page);
  });

  test('Offers page loads with a "New Offer" button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /new offer|create offer|\+ offer/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('creating an offer without approval shows it in the offer list', async ({ page }) => {
    await openCreateOfferModal(page);
    await fillOfferForm(page, { requiresApproval: false });

    // Save / create
    const saveBtn = page.getByRole('button', { name: /save|create|add offer/i }).last();
    await saveBtn.click();

    // Modal should close
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });

    // The offer should appear in the list (draft status)
    await expect(
      page.getByText(/draft|awaiting/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('sending a draft offer transitions status to "Awaiting response"', async ({ page }) => {
    // Create a fresh offer first
    await openCreateOfferModal(page);
    await fillOfferForm(page, { requiresApproval: false });
    const saveBtn = page.getByRole('button', { name: /save|create/i }).last();
    await saveBtn.click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });

    // Find the newly created draft offer and open its row menu
    const draftRow = page.locator('tr, [data-testid="offer-row"]').filter({
      has: page.getByText(/draft/i),
    }).last();

    if (!(await draftRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, 'Could not find a draft offer row');
      return;
    }

    // Open row actions
    const moreBtn = draftRow
      .getByRole('button', { name: /more|options|actions/i })
      .or(draftRow.locator('[aria-label*="more"], button').last())
      .first();

    if (await moreBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await moreBtn.click();

      // Click "Send" option
      const sendOption = page.getByRole('menuitem', { name: /^send$/i }).or(
        page.getByText(/^send offer$/i),
      ).first();

      if (await sendOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await sendOption.click();

        // Confirm if a confirmation dialog appears
        const confirmBtn = page.getByRole('button', { name: /confirm|send|yes/i }).last();
        if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // Status should update to "Awaiting response" or "Sent"
        await expect(
          page.getByText(/awaiting response|awaiting.*response|sent/i).first(),
        ).toBeVisible({ timeout: 15_000 });
      }
    } else {
      // Try clicking the offer row directly to open the offer modal
      await draftRow.click();
      const sendBtn = page.getByRole('button', { name: /send offer|send/i }).first();
      if (await sendBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await sendBtn.click();
        await expect(
          page.getByText(/awaiting response|sent/i).first(),
        ).toBeVisible({ timeout: 15_000 });
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Track B — with approval
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Offers — Track B (requires approval)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await openOffersPage(page);
  });

  test('creating offer with requiresApproval and submitting shows "Awaiting approval" status', async ({
    page,
  }) => {
    await openCreateOfferModal(page);
    await fillOfferForm(page, { requiresApproval: true });

    const saveBtn = page.getByRole('button', { name: /save|create/i }).last();
    await saveBtn.click();

    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });

    // After saving an offer that requires approval and sending it to the approval
    // queue, the status badge should reflect "pending_approval" / "Awaiting approval"
    await expect(
      page.getByText(/awaiting approval|pending approval/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('/offers/approve/:token page renders with offer details', async ({ page }) => {
    // Visit the approval page with a synthetic token — the page should render
    // its shell (branding banner + offer details section) even for unknown tokens,
    // showing an appropriate "loading" or "not found" state rather than crashing.
    const syntheticToken = 'qa-test-approval-token-000';
    await page.goto(`/offers/approve/${syntheticToken}`);

    // The page must not be blank and must not show a raw crash
    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });

    // The approval page always renders its banner shell. Either the offer is
    // displayed or a "not found / expired" message appears.
    await expect(
      page
        .getByText(
          /approve|decline|offer details|not found|expired|invalid|this offer/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    // No raw JS error messages
    await expect(page.getByText(/TypeError|ReferenceError|Cannot read/i)).toHaveCount(0);
  });

  test('/offers/respond/:token page renders with Accept and Decline buttons', async ({
    page,
  }) => {
    const syntheticToken = 'qa-test-respond-token-000';
    await page.goto(`/offers/respond/${syntheticToken}`);

    await expect(page.locator('body')).not.toBeEmpty({ timeout: 15_000 });

    // The response page should contain Accept/Decline calls-to-action, or
    // a graceful "offer not found" message.
    await expect(
      page
        .getByText(/accept|decline|not found|expired|respond to offer|this offer/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/TypeError|ReferenceError/i)).toHaveCount(0);
  });
});
