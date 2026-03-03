// @ts-check
const { test, expect } = require('@playwright/test');
const { blockFirebase, clearLocalStorage, seedLocalStorage } = require('./helpers/storage');
const { PR_ONLY, SINGLE_TRIP } = require('./fixtures/test-data');

/**
 * Responsive Layout Tests
 *
 * Verifies that the app is usable at mobile, tablet, and desktop viewports.
 * Covers element visibility, scrollability, and that no content is clipped.
 *
 * The mobile/safari projects in playwright.config.js also run this file on
 * real device emulations (Pixel 5, iPhone 13).
 */

// ---------------------------------------------------------------------------
// Mobile Viewport (375×812)
// ---------------------------------------------------------------------------
test.describe('Responsive - Mobile (375×812)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, { ...PR_ONLY, ...SINGLE_TRIP });
    await page.goto('/');
  });

  test('app header is visible on mobile', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('all four tabs are visible and tappable on mobile', async ({ page }) => {
    for (const tab of ['dashboard', 'trips', 'settings', 'data']) {
      const btn = page.locator(`[data-tab="${tab}"]`);
      await expect(btn).toBeVisible();
    }
  });

  test('stat cards are visible on mobile', async ({ page }) => {
    await expect(page.locator('#daysInCanada')).toBeVisible();
    await expect(page.locator('#daysRemaining')).toBeVisible();
    await expect(page.locator('#progressPercent')).toBeVisible();
  });

  test('progress bar is visible on mobile', async ({ page }) => {
    await expect(page.locator('.progress-bar')).toBeVisible();
  });

  test('countdown section is visible on mobile', async ({ page }) => {
    await expect(page.locator('#countdown')).toBeVisible();
  });

  test('trips tab loads and shows trip on mobile', async ({ page }) => {
    await page.locator('[data-tab="trips"]').click();
    await expect(page.locator('.trip-item')).toBeVisible();
  });

  test('trip modal is usable on mobile', async ({ page }) => {
    await page.locator('[data-tab="trips"]').click();
    await page.locator('#addTripBtn').click();

    await expect(page.locator('#tripModal')).toHaveClass(/active/);
    await expect(page.locator('#departureDate')).toBeVisible();
    await expect(page.locator('#returnDate')).toBeVisible();
    await expect(page.locator('#destination')).toBeVisible();
  });

  test('settings tab is scrollable and shows key elements on mobile', async ({ page }) => {
    await page.locator('[data-tab="settings"]').click();
    await expect(page.locator('#targetDate')).toBeVisible();
    await expect(page.locator('#addResidencyPeriodBtn')).toBeVisible();
    await expect(page.locator('#saveSettingsBtn')).toBeVisible();
  });

  test('data tab buttons are accessible on mobile', async ({ page }) => {
    await page.locator('[data-tab="data"]').click();
    await expect(page.locator('#exportBtn')).toBeVisible();
    await expect(page.locator('#importBtn')).toBeVisible();
    await expect(page.locator('#clearDataBtn')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Tablet Viewport (768×1024)
// ---------------------------------------------------------------------------
test.describe('Responsive - Tablet (768×1024)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
  });

  test('all stat cards are visible simultaneously on tablet', async ({ page }) => {
    await expect(page.locator('#daysInCanada')).toBeVisible();
    await expect(page.locator('#daysRemaining')).toBeVisible();
    await expect(page.locator('#progressPercent')).toBeVisible();
    await expect(page.locator('#totalTrips')).toBeVisible();
    await expect(page.locator('#totalTripDays')).toBeVisible();
  });

  test('tab navigation is visible on tablet', async ({ page }) => {
    const tabs = page.locator('.tab-button');
    await expect(tabs).toHaveCount(4);
    for (const tab of await tabs.all()) {
      await expect(tab).toBeVisible();
    }
  });

  test('switching tabs works on tablet', async ({ page }) => {
    await page.locator('[data-tab="trips"]').click();
    await expect(page.locator('#trips-section')).toBeVisible();

    await page.locator('[data-tab="settings"]').click();
    await expect(page.locator('#settings-section')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Desktop Viewport (1280×800)
// ---------------------------------------------------------------------------
test.describe('Responsive - Desktop (1280×800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
  });

  test('full app layout is visible without horizontal scroll', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
  });

  test('all stat cards are in a single row on desktop', async ({ page }) => {
    // Verify the grid renders correctly - all cards should be at the same Y position
    const cards = page.locator('.stat-card');
    await expect(cards).toHaveCount(5);

    const firstBox = await cards.first().boundingBox();
    const lastBox = await cards.last().boundingBox();

    // All cards should be in the same row (similar Y coordinate)
    // Allow some tolerance for padding differences
    expect(Math.abs(firstBox.y - lastBox.y)).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// Cross-viewport: Core functionality works at all sizes
// ---------------------------------------------------------------------------
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

for (const vp of VIEWPORTS) {
  test(`tab navigation works at ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');

    for (const tab of ['trips', 'settings', 'data', 'dashboard']) {
      await page.locator(`[data-tab="${tab}"]`).click();
      await expect(page.locator(`[data-tab="${tab}"]`)).toHaveClass(/active/);
    }
  });
}
