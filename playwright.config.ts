import { defineConfig, devices } from '@playwright/test';

/**
 * CoreflowHR Playwright configuration.
 * Runs Chrome, Firefox, and Safari at both desktop (1280×800) and mobile (375×812).
 * Screenshots and video captured on every failure.
 * All artefacts written to /test-results/.
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/e2e-artifacts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // ── Desktop ────────────────────────────────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'safari',
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } },
    },

    // ── Mobile ─────────────────────────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'], viewport: { width: 375, height: 812 } },
    },

    // ── Visual regression (Chromium only, deterministic) ──────────────────────
    {
      name: 'visual',
      testDir: './tests/visual',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'visual-mobile',
      testDir: './tests/visual',
      use: { ...devices['iPhone 12'], viewport: { width: 375, height: 812 } },
    },
  ],

  // Start dev server automatically when running locally
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
