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
  await page.getByLabel(/confirm password/i).fill(password);
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
  // Try sidebar logout button first, fall back to navigating to login
  const logoutBtn = page.getByRole('button', { name: /log out|sign out/i });
  if (await logoutBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await logoutBtn.click();
  } else {
    await page.goto(ROUTES.login);
  }
  await page.waitForURL(/\/login/, { timeout: 10_000 });
}
