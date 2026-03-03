// @ts-check
const { test, expect } = require('@playwright/test');
const { blockFirebase, seedLocalStorage } = require('./helpers/storage');
const {
  EMPTY,
  PR_ONLY,
  TEMPORARY_ONLY,
  TEMPORARY_CAPPED,
  ABSENCE_ONLY,
  MIXED_PERIODS,
  TRIPS_WITH_PR,
} = require('./fixtures/test-data');

/**
 * Calculation Engine Tests
 *
 * Verifies that the core daysInCanada calculation logic produces correct UI output
 * for each residency status type and the simple (legacy) PR-date + trips mode.
 *
 * Fixtures use deterministic historical dates (no isCurrent: true) to avoid
 * any dependency on the current date.
 *
 * See tests/fixtures/test-data.js for per-fixture expected value derivations.
 */

// Helper: parse a stat card value (removes commas for locale formatting)
async function getStatValue(page, id) {
  const text = await page.locator(`#${id}`).textContent();
  return parseInt(text.replace(/,/g, ''), 10);
}

async function getProgressPercent(page) {
  const text = await page.locator('#progressPercent').textContent();
  return parseFloat(text.replace('%', ''));
}

// ---------------------------------------------------------------------------
// Zero State
// ---------------------------------------------------------------------------
test.describe('Calculations - Zero State', () => {
  test('shows 0 days with no data', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, EMPTY);
    await page.goto('/');

    expect(await getStatValue(page, 'daysInCanada')).toBe(0);
    expect(await getStatValue(page, 'daysRemaining')).toBe(1095);
    expect(await getProgressPercent(page)).toBeCloseTo(0, 1);
  });
});

// ---------------------------------------------------------------------------
// PR Status (1.0× credit)
// ---------------------------------------------------------------------------
test.describe('Calculations - PR Status', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, PR_ONLY);
    await page.goto('/');
  });

  test('PR period gives non-zero days in Canada', async ({ page }) => {
    expect(await getStatValue(page, 'daysInCanada')).toBeGreaterThan(0);
  });

  test('PR period: days in Canada = 364 (within 2022-01-01 → 2022-12-31)', async ({ page }) => {
    // 364 = ceil((Date('2022-12-31') - Date('2022-01-01')) / ms)
    expect(await getStatValue(page, 'daysInCanada')).toBe(364);
  });

  test('PR period: days remaining = 731', async ({ page }) => {
    expect(await getStatValue(page, 'daysRemaining')).toBe(731);
  });

  test('PR period: progress ≈ 33.2%', async ({ page }) => {
    expect(await getProgressPercent(page)).toBeCloseTo(33.2, 0);
  });

  test('PR period: no days-outside (no absences recorded)', async ({ page }) => {
    expect(await getStatValue(page, 'totalTripDays')).toBe(0);
  });

  test('PR period: progress bar fill width matches percentage', async ({ page }) => {
    const barWidth = await page.locator('#progressFill').evaluate((el) => parseFloat(el.style.width));
    const labelPct = await getProgressPercent(page);
    expect(barWidth).toBeCloseTo(labelPct, 0);
  });
});

// ---------------------------------------------------------------------------
// Temporary Status (0.5× credit, capped at 365 days)
// ---------------------------------------------------------------------------
test.describe('Calculations - Temporary Status', () => {
  test('temporary period gives fewer days than equivalent PR period', async ({ page }) => {
    await blockFirebase(page);

    // Load temporary fixture and capture days
    await seedLocalStorage(page, TEMPORARY_ONLY);
    await page.goto('/');
    const tempDays = await getStatValue(page, 'daysInCanada');

    // Reload with PR fixture for same date range
    await seedLocalStorage(page, PR_ONLY);
    await page.goto('/');
    const prDays = await getStatValue(page, 'daysInCanada');

    expect(tempDays).toBeLessThan(prDays);
  });

  test('temporary period: days in Canada = 182 (half of 364)', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, TEMPORARY_ONLY);
    await page.goto('/');

    // 182 = min(365, floor(364 × 0.5))
    expect(await getStatValue(page, 'daysInCanada')).toBe(182);
  });

  test('temporary period: days remaining = 913', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, TEMPORARY_ONLY);
    await page.goto('/');

    expect(await getStatValue(page, 'daysRemaining')).toBe(913);
  });

  test('temporary period: progress ≈ 16.6%', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, TEMPORARY_ONLY);
    await page.goto('/');

    expect(await getProgressPercent(page)).toBeCloseTo(16.6, 0);
  });

  test('temporary credit is capped at 365 days regardless of period length', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, TEMPORARY_CAPPED);
    await page.goto('/');

    // 3 years of temporary (1095 raw days) → credit = min(365, 547.5) = 365
    expect(await getStatValue(page, 'daysInCanada')).toBe(365);
    expect(await getStatValue(page, 'daysRemaining')).toBe(730);
  });
});

// ---------------------------------------------------------------------------
// Absence Status (0× credit)
// ---------------------------------------------------------------------------
test.describe('Calculations - Absence Status', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, ABSENCE_ONLY);
    await page.goto('/');
  });

  test('absence period gives 0 days in Canada', async ({ page }) => {
    expect(await getStatValue(page, 'daysInCanada')).toBe(0);
  });

  test('absence period: days remaining = 1,095', async ({ page }) => {
    expect(await getStatValue(page, 'daysRemaining')).toBe(1095);
  });

  test('absence period: progress = 0.0%', async ({ page }) => {
    expect(await getProgressPercent(page)).toBeCloseTo(0, 1);
    await expect(page.locator('#progressPercent')).toHaveText('0.0%');
  });

  test('absence period shows days in "Days Outside" stat', async ({ page }) => {
    // absenceDays are reported as daysOutside (totalTripDays when using residency periods)
    const outside = await getStatValue(page, 'totalTripDays');
    expect(outside).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Status Credit Ordering
// ---------------------------------------------------------------------------
test.describe('Calculations - Status Credit Ordering', () => {
  test('PR earns more credit than Temporary for the same period', async ({ page }) => {
    await blockFirebase(page);

    await seedLocalStorage(page, PR_ONLY);
    await page.goto('/');
    const prDays = await getStatValue(page, 'daysInCanada');

    await seedLocalStorage(page, TEMPORARY_ONLY);
    await page.goto('/');
    const tempDays = await getStatValue(page, 'daysInCanada');

    await seedLocalStorage(page, ABSENCE_ONLY);
    await page.goto('/');
    const absenceDays = await getStatValue(page, 'daysInCanada');

    expect(prDays).toBeGreaterThan(tempDays);
    expect(tempDays).toBeGreaterThan(absenceDays);
    expect(absenceDays).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Mixed Periods
// ---------------------------------------------------------------------------
test.describe('Calculations - Mixed Periods', () => {
  test('mixed Temporary + PR periods produce days > 0', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, MIXED_PERIODS);
    await page.goto('/');

    expect(await getStatValue(page, 'daysInCanada')).toBeGreaterThan(0);
  });

  test('mixed periods with long PR result in 100% progress', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, MIXED_PERIODS);
    await page.goto('/');

    // MIXED_PERIODS has ~3 years of PR + ~1.5 years of Temporary → > 1095 days total
    expect(await getProgressPercent(page)).toBeCloseTo(100, 0);
    expect(await getStatValue(page, 'daysRemaining')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Simple (Legacy) Mode - PR Date + Trips
// ---------------------------------------------------------------------------
test.describe('Calculations - Simple Mode (PR Date + Trips)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, TRIPS_WITH_PR);
    await page.goto('/');
  });

  test('simple mode produces non-zero days with PR date set', async ({ page }) => {
    expect(await getStatValue(page, 'daysInCanada')).toBeGreaterThan(0);
  });

  test('trips are counted and reflected in "Days Outside"', async ({ page }) => {
    // TRIPS_WITH_PR has 2 trips; in simple mode totalTripDays = trip days count
    expect(await getStatValue(page, 'totalTrips')).toBe(2);
    expect(await getStatValue(page, 'totalTripDays')).toBeGreaterThan(0);
  });

  test('more trips = more days outside = fewer days in Canada', async ({ page }) => {
    // Baseline with 2 trips
    const daysWith2Trips = await getStatValue(page, 'daysInCanada');

    // Add a third trip via UI
    await page.locator('[data-tab="trips"]').click();
    await page.locator('#addTripBtn').click();
    await page.locator('#departureDate').fill('2024-04-01');
    await page.locator('#returnDate').fill('2024-04-21'); // 19 days outside
    await page.locator('#destination').fill('Italy');
    await page.locator('#reason').selectOption('vacation');
    await page.locator('#tripForm button[type="submit"]').click();

    await page.locator('[data-tab="dashboard"]').click();
    const daysWith3Trips = await getStatValue(page, 'daysInCanada');

    expect(daysWith3Trips).toBeLessThan(daysWith2Trips);
  });
});

// ---------------------------------------------------------------------------
// Progress Bar Invariants
// ---------------------------------------------------------------------------
test.describe('Calculations - Progress Bar Invariants', () => {
  test('progress bar never exceeds 100% even when days > 1095', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, MIXED_PERIODS); // results in > 1095 days
    await page.goto('/');

    const barWidth = await page.locator('#progressFill').evaluate((el) => parseFloat(el.style.width));
    expect(barWidth).toBeLessThanOrEqual(100);
  });

  test('days in Canada + days remaining always equals 1095', async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, PR_ONLY);
    await page.goto('/');

    const days = await getStatValue(page, 'daysInCanada');
    const remaining = await getStatValue(page, 'daysRemaining');
    expect(days + remaining).toBe(1095);
  });
});
