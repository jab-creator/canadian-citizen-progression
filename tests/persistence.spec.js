// @ts-check
const { test, expect } = require('@playwright/test');
const { blockFirebase, clearLocalStorage, seedLocalStorage, getLocalStorageValue } = require('./helpers/storage');
const { PR_ONLY, SINGLE_TRIP } = require('./fixtures/test-data');

/**
 * Data Persistence Tests
 *
 * Verifies that the app correctly reads data from localStorage on load and
 * that user actions survive a full page reload.
 */

// ---------------------------------------------------------------------------
// Data survives page reload
// ---------------------------------------------------------------------------
test.describe('Persistence - Reload', () => {
  test('seeded trip data is visible after page reload', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, SINGLE_TRIP);
    await page.goto('/');

    // Verify visible before reload
    await page.locator('[data-tab="trips"]').click();
    await expect(page.locator('.trip-item')).toHaveCount(1);

    // Reload and check again
    await page.reload();
    await page.locator('[data-tab="trips"]').click();
    await expect(page.locator('.trip-item')).toHaveCount(1);
    await expect(page.locator('.trip-item')).toContainText('France');
  });

  test('seeded settings are applied after page reload', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, PR_ONLY);
    await page.goto('/');

    const daysBefore = await page.locator('#daysInCanada').textContent();

    await page.reload();
    const daysAfter = await page.locator('#daysInCanada').textContent();

    expect(daysAfter).toBe(daysBefore);
  });

  test('trip added via UI persists across page reload', async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');

    // Add a trip
    await page.locator('[data-tab="trips"]').click();
    await page.locator('#addTripBtn').click();
    await page.locator('#departureDate').fill('2023-08-01');
    await page.locator('#returnDate').fill('2023-08-10');
    await page.locator('#destination').fill('Germany');
    await page.locator('#reason').selectOption('business');
    await page.locator('#tripForm button[type="submit"]').click();

    await expect(page.locator('.trip-item')).toHaveCount(1);

    // Reload
    await page.reload();
    await page.locator('[data-tab="trips"]').click();
    await expect(page.locator('.trip-item')).toHaveCount(1);
    await expect(page.locator('.trip-item')).toContainText('Germany');
  });

  test('settings saved via UI persist across page reload', async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');

    // Add and save a setting
    await page.locator('[data-tab="settings"]').click();
    await page.locator('#targetDate').fill('2026-03-15');
    await page.locator('#addResidencyPeriodBtn').click();
    const row = page.locator('.residency-period-row').first();
    await row.locator('.period-start').fill('2023-01-01');
    await row.locator('.period-end').fill('2023-12-31');
    await row.locator('.period-status').selectOption('pr');
    await page.locator('#saveSettingsBtn').click();

    // Reload
    await page.reload();
    await page.locator('[data-tab="settings"]').click();

    await expect(page.locator('#targetDate')).toHaveValue('2026-03-15');
    await expect(page.locator('.residency-period-row')).toHaveCount(1);
    await expect(page.locator('.period-status').first()).toHaveValue('pr');
  });

  test('deleted trip does not reappear after reload', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, SINGLE_TRIP);
    await page.goto('/');

    // Delete the trip
    await page.locator('[data-tab="trips"]').click();
    page.once('dialog', async (dialog) => dialog.accept());
    await page.locator('.trip-item .btn-danger').first().click();
    await expect(page.locator('.trip-item')).toHaveCount(0);

    // Reload and confirm it's still gone
    await page.reload();
    await page.locator('[data-tab="trips"]').click();
    await expect(page.locator('.trip-item')).toHaveCount(0);
  });

  test('dashboard stats are consistent between fresh load and reload', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, PR_ONLY);
    await page.goto('/');

    const daysBefore = await page.locator('#daysInCanada').textContent();
    const progressBefore = await page.locator('#progressPercent').textContent();

    await page.reload();

    await expect(page.locator('#daysInCanada')).toHaveText(daysBefore);
    await expect(page.locator('#progressPercent')).toHaveText(progressBefore);
  });
});

// ---------------------------------------------------------------------------
// Clean state
// ---------------------------------------------------------------------------
test.describe('Persistence - Clean State', () => {
  test('clearing data removes it from localStorage', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, SINGLE_TRIP);
    await page.goto('/');

    // Clear via UI
    await page.locator('[data-tab="data"]').click();
    page.once('dialog', async (dialog) => dialog.accept());
    await page.locator('#clearDataBtn').click();

    const trips = await getLocalStorageValue(page, 'citizenship-trips');
    expect(trips === null || (Array.isArray(trips) && trips.length === 0)).toBe(true);
  });

  test('after clearing, reload shows zero state', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, PR_ONLY);
    await page.goto('/');

    // Clear via UI
    await page.locator('[data-tab="data"]').click();
    page.once('dialog', async (dialog) => dialog.accept());
    await page.locator('#clearDataBtn').click();

    // Reload and verify zero state
    await page.reload();
    await expect(page.locator('#daysInCanada')).toHaveText('0');
    await expect(page.locator('#daysRemaining')).toHaveText('1,095');
    await expect(page.locator('#progressPercent')).toHaveText('0.0%');
  });
});

// ---------------------------------------------------------------------------
// localStorage isolation between test contexts
// ---------------------------------------------------------------------------
test.describe('Persistence - Test Isolation', () => {
  test('each test starts with a clean localStorage when clearLocalStorage is used', async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');

    // Confirm no trips in storage
    const trips = await getLocalStorageValue(page, 'citizenship-trips');
    expect(trips).toBeNull();

    // Confirm UI is in zero state
    await expect(page.locator('#daysInCanada')).toHaveText('0');
  });
});
