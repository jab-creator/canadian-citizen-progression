// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { blockFirebase, clearLocalStorage, seedLocalStorage, getLocalStorageValue } = require('./helpers/storage');
const { SINGLE_TRIP, PR_ONLY } = require('./fixtures/test-data');

/**
 * Data Management Tab Tests
 *
 * Covers Export, Import, and Clear All Data functionality.
 */

async function goToData(page) {
  await page.locator('[data-tab="data"]').click();
  await expect(page.locator('#data-section')).toBeVisible();
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
test.describe('Data Management - Export', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, { ...SINGLE_TRIP, ...PR_ONLY });
    await page.goto('/');
    await goToData(page);
  });

  test('Export Data button is visible', async ({ page }) => {
    await expect(page.locator('#exportBtn')).toBeVisible();
  });

  test('Export Data triggers a file download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#exportBtn').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/citizenship.*\.json/i);
  });

  test('exported file contains trips and settings', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#exportBtn').click(),
    ]);

    const downloadPath = await download.path();
    const content = JSON.parse(fs.readFileSync(downloadPath, 'utf-8'));

    expect(content).toHaveProperty('trips');
    expect(content).toHaveProperty('settings');
  });
});

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------
test.describe('Data Management - Import', () => {
  // Create a temp JSON file with known data before each test
  let importFilePath;

  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
    await goToData(page);

    // Write a temporary import fixture to disk
    importFilePath = path.join(__dirname, 'fixtures', '__temp-import.json');
    fs.writeFileSync(
      importFilePath,
      JSON.stringify({
        trips: [
          {
            id: 9001,
            departureDate: '2022-05-01',
            returnDate: '2022-05-15',
            destination: 'Portugal',
            reason: 'vacation',
            otherReason: '',
          },
        ],
        settings: {
          targetDate: '2025-06-01',
          residencyPeriods: [],
        },
      })
    );
  });

  test.afterEach(() => {
    if (importFilePath && fs.existsSync(importFilePath)) {
      fs.unlinkSync(importFilePath);
    }
  });

  test('Import Data button is visible', async ({ page }) => {
    await expect(page.locator('#importBtn')).toBeVisible();
  });

  test('importing a valid JSON file loads the data', async ({ page }) => {
    await page.locator('#importFile').setInputFiles(importFilePath);

    // After import, dashboard should reflect new data
    await page.locator('[data-tab="trips"]').click();
    await expect(page.locator('.trip-item')).toHaveCount(1);
    await expect(page.locator('.trip-item')).toContainText('Portugal');
  });

  test('imported data is persisted to localStorage', async ({ page }) => {
    await page.locator('#importFile').setInputFiles(importFilePath);

    const trips = await getLocalStorageValue(page, 'citizenship-trips');
    expect(trips).toHaveLength(1);
    expect(trips[0].destination).toBe('Portugal');
  });

  test('imported settings are applied', async ({ page }) => {
    await page.locator('#importFile').setInputFiles(importFilePath);

    const settings = await getLocalStorageValue(page, 'citizenship-settings');
    expect(settings.targetDate).toBe('2025-06-01');
  });
});

// ---------------------------------------------------------------------------
// Import round-trip: export then re-import
// ---------------------------------------------------------------------------
test.describe('Data Management - Export / Import Round-Trip', () => {
  test('data survives an export → import round-trip', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, SINGLE_TRIP);
    await page.goto('/');
    await goToData(page);

    // Export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#exportBtn').click(),
    ]);
    const exportPath = await download.path();
    const exported = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

    // Wipe state
    await page.evaluate(() => {
      localStorage.removeItem('citizenship-trips');
      localStorage.removeItem('citizenship-settings');
    });

    // Write exported content to a temp file and re-import
    const reimportPath = path.join(__dirname, 'fixtures', '__reimport.json');
    fs.writeFileSync(reimportPath, JSON.stringify(exported));

    await page.locator('#importFile').setInputFiles(reimportPath);
    fs.unlinkSync(reimportPath);

    // Verify the trip is restored
    await page.locator('[data-tab="trips"]').click();
    await expect(page.locator('.trip-item')).toHaveCount(1);
    await expect(page.locator('.trip-item')).toContainText('France');
  });
});

// ---------------------------------------------------------------------------
// Clear All Data
// ---------------------------------------------------------------------------
test.describe('Data Management - Clear All Data', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, SINGLE_TRIP);
    await page.goto('/');
    await goToData(page);
  });

  test('Clear All Data button is visible', async ({ page }) => {
    await expect(page.locator('#clearDataBtn')).toBeVisible();
  });

  test('clicking Clear All Data shows a confirmation dialog', async ({ page }) => {
    let dialogShown = false;
    page.once('dialog', async (dialog) => {
      dialogShown = true;
      await dialog.dismiss();
    });

    await page.locator('#clearDataBtn').click();
    expect(dialogShown).toBe(true);
  });

  test('confirming clear removes all trips', async ({ page }) => {
    page.once('dialog', async (dialog) => dialog.accept());
    await page.locator('#clearDataBtn').click();

    // Switch to trips tab and verify empty
    await page.locator('[data-tab="trips"]').click();
    await expect(page.locator('.trip-item')).toHaveCount(0);
    await expect(page.locator('#tripsList .empty-state')).toBeVisible();
  });

  test('confirming clear resets localStorage', async ({ page }) => {
    page.once('dialog', async (dialog) => dialog.accept());
    await page.locator('#clearDataBtn').click();

    const trips = await getLocalStorageValue(page, 'citizenship-trips');
    expect(trips === null || trips.length === 0).toBe(true);
  });

  test('confirming clear resets dashboard to zero state', async ({ page }) => {
    page.once('dialog', async (dialog) => dialog.accept());
    await page.locator('#clearDataBtn').click();

    await page.locator('[data-tab="dashboard"]').click();
    await expect(page.locator('#daysInCanada')).toHaveText('0');
    await expect(page.locator('#totalTrips')).toHaveText('0');
  });

  test('dismissing the clear dialog preserves data', async ({ page }) => {
    page.once('dialog', async (dialog) => dialog.dismiss());
    await page.locator('#clearDataBtn').click();

    const trips = await getLocalStorageValue(page, 'citizenship-trips');
    expect(trips).toHaveLength(1);
  });
});
