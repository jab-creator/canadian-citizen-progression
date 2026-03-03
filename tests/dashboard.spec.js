// @ts-check
const { test, expect } = require('@playwright/test');
const { blockFirebase, clearLocalStorage, seedLocalStorage } = require('./helpers/storage');
const { EMPTY, PR_ONLY } = require('./fixtures/test-data');

/**
 * Dashboard Tests
 *
 * Covers stat card values, the progress bar, and the countdown timer
 * in both the empty state and when data is present.
 */
test.describe('Dashboard - Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
  });

  test('shows 0 days in Canada with no data', async ({ page }) => {
    await expect(page.locator('#daysInCanada')).toHaveText('0');
  });

  test('shows 1,095 days remaining with no data', async ({ page }) => {
    await expect(page.locator('#daysRemaining')).toHaveText('1,095');
  });

  test('shows 0.0% progress with no data', async ({ page }) => {
    await expect(page.locator('#progressPercent')).toHaveText('0.0%');
  });

  test('shows 0 total trips with no data', async ({ page }) => {
    await expect(page.locator('#totalTrips')).toHaveText('0');
  });

  test('shows 0 total trip days with no data', async ({ page }) => {
    await expect(page.locator('#totalTripDays')).toHaveText('0');
  });

  test('progress bar fill is at 0% with no data', async ({ page }) => {
    const width = await page.locator('#progressFill').evaluate((el) => el.style.width);
    expect(width).toBe('0%');
  });

  test('progress text shows 0 / 1,095 days with no data', async ({ page }) => {
    await expect(page.locator('#progressText')).toHaveText('0 / 1,095 days');
  });

  test('countdown timer digits update each second', async ({ page }) => {
    const before = await page.locator('#countdownSeconds').textContent();
    await page.waitForTimeout(1100);
    const after = await page.locator('#countdownSeconds').textContent();

    // Seconds should have changed (or wrapped from 59 to 0, still different from start)
    // Note: they COULD be the same if the second flipped during the two reads -
    // use a longer wait to make the assertion reliable
    await page.waitForTimeout(1100);
    const after2 = await page.locator('#countdownSeconds').textContent();

    // At least one of the two subsequent reads should differ from the first
    const changed = before !== after || before !== after2;
    expect(changed).toBe(true);
  });
});

test.describe('Dashboard - With Data', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, PR_ONLY);
    await page.goto('/');
  });

  test('displays non-zero days in Canada when residency data is loaded', async ({ page }) => {
    const text = await page.locator('#daysInCanada').textContent();
    const days = parseInt(text.replace(/,/g, ''), 10);
    expect(days).toBeGreaterThan(0);
  });

  test('days remaining is less than 1,095 when residency data is loaded', async ({ page }) => {
    const text = await page.locator('#daysRemaining').textContent();
    const remaining = parseInt(text.replace(/,/g, ''), 10);
    expect(remaining).toBeLessThan(1095);
  });

  test('progress percentage is greater than 0% when data is loaded', async ({ page }) => {
    const text = await page.locator('#progressPercent').textContent();
    const pct = parseFloat(text.replace('%', ''));
    expect(pct).toBeGreaterThan(0);
  });

  test('progress bar fill width is greater than 0%', async ({ page }) => {
    const width = await page.locator('#progressFill').evaluate((el) => parseFloat(el.style.width));
    expect(width).toBeGreaterThan(0);
  });

  test('progress text reflects days in Canada', async ({ page }) => {
    await expect(page.locator('#progressText')).toContainText('/ 1,095 days');
    // The left side should not be 0
    const text = await page.locator('#progressText').textContent();
    expect(text).not.toMatch(/^0 \//);
  });

  test('days in Canada + days remaining sums to 1,095 (approximately)', async ({ page }) => {
    const daysText = await page.locator('#daysInCanada').textContent();
    const remainText = await page.locator('#daysRemaining').textContent();

    const days = parseInt(daysText.replace(/,/g, ''), 10);
    const remain = parseInt(remainText.replace(/,/g, ''), 10);

    // Sum should be exactly 1095 (daysRemaining = max(0, 1095 - daysInCanada))
    expect(days + remain).toBe(1095);
  });
});

test.describe('Dashboard - Eligibility Reached', () => {
  test('shows celebration emoji when eligible', async ({ page }) => {
    await blockFirebase(page);
    // Load data where daysInCanada >= 1095 → 3 full years as PR
    const eligibleData = {
      trips: [],
      settings: {
        targetDate: '2025-01-01',
        residencyPeriods: [
          // 3 full years = 1095+ days → eligible
          { startDate: '2020-01-01', endDate: '2023-01-01', status: 'pr', isCurrent: false },
        ],
      },
    };
    await seedLocalStorage(page, eligibleData);
    await page.goto('/');

    // When eligible, countdown shows celebration symbols
    await expect(page.locator('#countdownHours')).toHaveText('ELIGIBLE');
    await expect(page.locator('#countdownMinutes')).toHaveText('NOW');
  });
});
