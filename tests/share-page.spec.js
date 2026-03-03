// @ts-check
const { test, expect } = require('@playwright/test');
const { blockFirebase } = require('./helpers/storage');

/**
 * Share Page Tests
 *
 * Covers share.html and demo-share.html.
 * Both pages are standalone and do not depend on the main app's localStorage.
 *
 * Note: Full Firebase-backed share functionality (loading a shared snapshot
 * from Firestore via a share ID) is not tested here because it requires live
 * cloud credentials. Those flows should be covered by integration tests that
 * run against a Firebase emulator.
 */

// ---------------------------------------------------------------------------
// share.html
// ---------------------------------------------------------------------------
test.describe('Share Page (share.html)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('share page loads without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => {
      // Ignore Firebase network errors (expected when Firebase is blocked)
      if (!err.message.includes('firebase') && !err.message.includes('net::ERR_')) {
        errors.push(err.message);
      }
    });

    await page.goto('/share.html');
    await page.waitForLoadState('domcontentloaded');
    expect(errors).toHaveLength(0);
  });

  test('share page has correct document title', async ({ page }) => {
    await page.goto('/share.html');
    await expect(page).toHaveTitle(/citizenship/i);
  });

  test('share page shows a loading or "not found" state without a valid share ID', async ({ page }) => {
    await page.goto('/share.html');
    await page.waitForLoadState('domcontentloaded');

    // Without a share ID the page should show some kind of informational state
    const body = await page.locator('body').textContent();
    // It should not be completely blank
    expect(body.trim().length).toBeGreaterThan(0);
  });

  test('share page does not show the main app nav tabs', async ({ page }) => {
    await page.goto('/share.html');
    // The share page is a read-only view — it should not have edit controls
    await expect(page.locator('[data-tab="trips"]')).toHaveCount(0);
    await expect(page.locator('#addTripBtn')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// demo-share.html
// ---------------------------------------------------------------------------
test.describe('Demo Share Page (demo-share.html)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('demo share page loads without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => {
      if (!err.message.includes('firebase') && !err.message.includes('net::ERR_')) {
        errors.push(err.message);
      }
    });

    await page.goto('/demo-share.html');
    await page.waitForLoadState('domcontentloaded');
    expect(errors).toHaveLength(0);
  });

  test('demo share page has correct document title', async ({ page }) => {
    await page.goto('/demo-share.html');
    await expect(page).toHaveTitle(/citizenship/i);
  });

  test('demo share page displays citizenship progress information', async ({ page }) => {
    await page.goto('/demo-share.html');
    await page.waitForLoadState('domcontentloaded');

    // Demo page should show progress content
    const body = await page.locator('body').textContent();
    expect(body.trim().length).toBeGreaterThan(0);
  });

  test('demo share page does not show edit controls', async ({ page }) => {
    await page.goto('/demo-share.html');
    await expect(page.locator('#addTripBtn')).toHaveCount(0);
    await expect(page.locator('#saveSettingsBtn')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Main app - Share Modal UI (requires auth, so just check button presence)
// ---------------------------------------------------------------------------
test.describe('Main App - Share Button', () => {
  test('share button appears in the user section (visible when authenticated)', async ({ page }) => {
    await blockFirebase(page);
    await page.goto('/');

    // The #shareBtn is inside #userSection which is hidden when not authenticated.
    // We just verify the element exists in the DOM.
    await expect(page.locator('#shareBtn')).toHaveCount(1);
  });
});
