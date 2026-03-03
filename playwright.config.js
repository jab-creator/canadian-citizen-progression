// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for Canadian Citizenship Tracker E2E tests.
 *
 * The app is pure HTML/CSS/JS with no build step.
 * Tests run against a local http-server instance.
 * Firebase is blocked in all tests to keep them isolated from cloud state.
 */
module.exports = defineConfig({
  testDir: './tests',

  // Run all tests in parallel
  fullyParallel: true,

  // Fail the build on CI if test.only is accidentally left in source
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // One worker on CI to avoid resource contention; auto-detect locally
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:3000',

    // Collect traces and screenshots only on failure
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Use Toronto timezone (representative of Canadian users)
    timezoneId: 'America/Toronto',
    locale: 'en-CA',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      // Mobile tests - only run responsive spec
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/responsive.spec.js',
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      testMatch: '**/responsive.spec.js',
    },
  ],

  // Start a local web server before running tests
  webServer: {
    command: 'npx http-server . -p 3000 -s --cors',
    url: 'http://localhost:3000',
    // Reuse existing server when running locally; always start fresh on CI
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
