import type { Page } from '@playwright/test';
import { TEST_USERS, ROUTES } from '../fixtures/test-data';

type Role = keyof typeof TEST_USERS;

/**
 * Log in as a specific role. Waits for redirect to dashboard.
 */
export async function loginAs(page: Page, role: Role): Promise<void> {
  const creds = TEST_USERS[role];
  await page.goto(ROUTES.login);
  await page.getByLabel(/email/i).fill(creds.email);
  await page.locator('#password').fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });
  // Wait for the app's auth initialization to complete before returning.
  // ProtectedRoute shows "Initializing System" while loading — the sidebar
  // and dashboard content only render after this screen disappears.
  await page
    .locator('text=Initializing System')
    .waitFor({ state: 'hidden', timeout: 15_000 })
    .catch(() => {
      // If the text never appeared (fast load), the page is already ready.
    });
}

/**
 * Sign up a fresh user account with a unique email.
 * Returns the email used so the test can clean up afterwards.
 */
export async function signUpNewUser(
  page: Page,
  overrides: { name?: string; email?: string; password?: string } = {}
): Promise<{ email: string; password: string }> {
  const ts = Date.now();
  const email = overrides.email ?? `qa-fresh-${ts}@coreflow-test.com`;
  const password = overrides.password ?? 'FreshUser!2025';
  const name = overrides.name ?? 'QA Fresh User';

  await page.goto(ROUTES.signup);
  await page.getByLabel(/your name/i).fill(name);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.locator('#confirm-password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /create account/i }).click();

  return { email, password };
}

/**
 * Complete the onboarding wizard with minimal required data.
 * Assumes the page is already at /onboarding.
 */
export async function completeOnboarding(page: Page): Promise<void> {
  // Step 1 — workspace name
  const workspaceInput = page.getByPlaceholder(/workspace name/i);
  if (await workspaceInput.isVisible()) {
    await workspaceInput.fill('QA Workspace');
    await page.getByRole('button', { name: /next|continue/i }).click();
  }
  // Step 2 — profile (skip if already set)
  const nextBtn = page.getByRole('button', { name: /next|continue|skip/i });
  if (await nextBtn.isVisible()) await nextBtn.click();
  // Step 3 — Google connect — skip
  const skipBtn = page.getByRole('button', { name: /skip/i });
  if (await skipBtn.isVisible()) await skipBtn.click();
  // Step 4 — add client — skip
  if (await skipBtn.isVisible()) await skipBtn.click();
  // Step 5 — invite team — skip
  if (await skipBtn.isVisible()) await skipBtn.click();
  // Completion
  const finishBtn = page.getByRole('button', { name: /finish|get started|go to dashboard/i });
  if (await finishBtn.isVisible()) await finishBtn.click();
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
}

/**
 * Log out the current user.
 */
export async function logout(page: Page): Promise<void> {
  // The dev-overlay (fixed bottom-left z-[400]) sits over the sidebar footer
  // and intercepts coordinate-based pointer events — including Playwright's
  // force:true clicks (which still hit-test via the browser).
  // dispatchEvent fires directly on the DOM element, bypassing hit-testing
  // entirely, so React's event delegation picks it up correctly.
  //
  // We do NOT wait for profile loading to complete (p.font-semibold).
  // The sidebar profile API call can fail in the full suite (auth state from
  // previous tests). The trigger div is always in the DOM once the sidebar
  // renders, regardless of profile load state.

  // 1. Wait for the sidebar profile trigger div to exist
  await page.waitForFunction(
    () =>
      document.querySelector(
        'div[class*="border-t"][class*="border-gray-200"] > div[class*="cursor-pointer"]',
      ) !== null,
    { timeout: 15_000 },
  );

  // 2. Open the profile dropdown
  await page.evaluate(() => {
    const trigger = document.querySelector(
      'div[class*="border-t"][class*="border-gray-200"] > div[class*="cursor-pointer"]',
    ) as HTMLElement;
    trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  // 3. Wait for the Log out button to appear in the dropdown
  await page.locator('button', { hasText: /log out/i })
    .waitFor({ state: 'visible', timeout: 5_000 });

  // 4. Click Log out via dispatchEvent to bypass the overlay
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => /log out/i.test(b.textContent ?? ''),
    ) as HTMLElement | undefined;
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  await page.waitForURL(/\/login/, { timeout: 15_000 });
}
