// @ts-check
const { test, expect } = require('@playwright/test');
const { blockFirebase, clearLocalStorage, seedLocalStorage, getLocalStorageValue } = require('./helpers/storage');
const { EMPTY, SINGLE_TRIP } = require('./fixtures/test-data');

/**
 * Trips Tab Tests
 *
 * Covers the full CRUD lifecycle for trip records:
 * empty state, add, edit, delete, and form validation.
 */

/** Navigate to the Trips tab. */
async function goToTrips(page) {
  await page.locator('[data-tab="trips"]').click();
  await expect(page.locator('#trips-section')).toBeVisible();
}

/** Fill in and submit the trip modal form. */
async function fillTripForm(page, { departure, returnDate, destination, reason = 'vacation', otherReason = '' }) {
  await page.locator('#departureDate').fill(departure);
  await page.locator('#returnDate').fill(returnDate);
  await page.locator('#destination').fill(destination);
  await page.locator('#reason').selectOption(reason);

  if (reason === 'other') {
    await expect(page.locator('#otherReasonGroup')).toBeVisible();
    await page.locator('#otherReason').fill(otherReason);
  }

  await page.locator('#tripForm button[type="submit"]').click();
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------
test.describe('Trips - Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
    await goToTrips(page);
  });

  test('shows empty state message when no trips recorded', async ({ page }) => {
    await expect(page.locator('#tripsList .empty-state')).toBeVisible();
    await expect(page.locator('#tripsList')).toContainText('No trips recorded yet');
  });

  test('Add Trip button is visible', async ({ page }) => {
    await expect(page.locator('#addTripBtn')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Adding Trips
// ---------------------------------------------------------------------------
test.describe('Trips - Add Trip', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
    await goToTrips(page);
  });

  test('clicking Add Trip opens the modal', async ({ page }) => {
    await page.locator('#addTripBtn').click();
    await expect(page.locator('#tripModal')).toHaveClass(/active/);
    await expect(page.locator('#modalTitle')).toHaveText('Add Trip');
  });

  test('modal closes when Cancel is clicked', async ({ page }) => {
    await page.locator('#addTripBtn').click();
    await page.locator('#cancelBtn').click();
    await expect(page.locator('#tripModal')).not.toHaveClass(/active/);
  });

  test('modal closes when X button is clicked', async ({ page }) => {
    await page.locator('#addTripBtn').click();
    await page.locator('#closeModal').click();
    await expect(page.locator('#tripModal')).not.toHaveClass(/active/);
  });

  test('modal closes when overlay is clicked', async ({ page }) => {
    await page.locator('#addTripBtn').click();
    await page.locator('#overlay').click();
    await expect(page.locator('#tripModal')).not.toHaveClass(/active/);
  });

  test('adding a trip shows it in the list', async ({ page }) => {
    await page.locator('#addTripBtn').click();
    await fillTripForm(page, {
      departure: '2023-06-01',
      returnDate: '2023-06-11',
      destination: 'United States',
      reason: 'vacation',
    });

    await expect(page.locator('.trip-item')).toHaveCount(1);
    await expect(page.locator('.trip-item')).toContainText('United States');
  });

  test('trip duration is calculated and displayed correctly', async ({ page }) => {
    // 10 days difference → duration = 10 - 1 = 9 days (departure and return are partial days)
    await page.locator('#addTripBtn').click();
    await fillTripForm(page, {
      departure: '2023-06-01',
      returnDate: '2023-06-11',
      destination: 'United States',
      reason: 'vacation',
    });

    await expect(page.locator('.trip-duration')).toHaveText('9 days');
  });

  test('trip is persisted to localStorage after saving', async ({ page }) => {
    await page.locator('#addTripBtn').click();
    await fillTripForm(page, {
      departure: '2023-06-01',
      returnDate: '2023-06-11',
      destination: 'United States',
      reason: 'vacation',
    });

    const trips = await getLocalStorageValue(page, 'citizenship-trips');
    expect(trips).toHaveLength(1);
    expect(trips[0].destination).toBe('United States');
    expect(trips[0].departureDate).toBe('2023-06-01');
  });

  test('adding a trip updates the dashboard trip count', async ({ page }) => {
    await page.locator('#addTripBtn').click();
    await fillTripForm(page, {
      departure: '2023-06-01',
      returnDate: '2023-06-11',
      destination: 'United States',
      reason: 'vacation',
    });

    // Switch back to dashboard
    await page.locator('[data-tab="dashboard"]').click();
    await expect(page.locator('#totalTrips')).toHaveText('1');
  });

  test('reason dropdown "Other" reveals custom input field', async ({ page }) => {
    await page.locator('#addTripBtn').click();
    await expect(page.locator('#otherReasonGroup')).toBeHidden();

    await page.locator('#reason').selectOption('other');
    await expect(page.locator('#otherReasonGroup')).toBeVisible();
  });

  test('can save a trip with "Other" reason', async ({ page }) => {
    await page.locator('#addTripBtn').click();
    await fillTripForm(page, {
      departure: '2023-09-01',
      returnDate: '2023-09-05',
      destination: 'Germany',
      reason: 'other',
      otherReason: 'Sabbatical',
    });

    await expect(page.locator('.trip-item')).toContainText('Sabbatical');
  });

  test('multiple trips are listed in reverse chronological order', async ({ page }) => {
    // Add older trip
    await page.locator('#addTripBtn').click();
    await fillTripForm(page, { departure: '2022-01-01', returnDate: '2022-01-10', destination: 'Japan', reason: 'vacation' });

    // Add newer trip
    await page.locator('#addTripBtn').click();
    await fillTripForm(page, { departure: '2023-06-01', returnDate: '2023-06-10', destination: 'Mexico', reason: 'vacation' });

    const items = page.locator('.trip-item');
    await expect(items).toHaveCount(2);

    // Most recent trip (2023) should appear first
    await expect(items.first()).toContainText('Mexico');
    await expect(items.last()).toContainText('Japan');
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
test.describe('Trips - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
    await goToTrips(page);
    await page.locator('#addTripBtn').click();
  });

  test('shows alert when return date is before departure date', async ({ page }) => {
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.locator('#departureDate').fill('2023-06-10');
    await page.locator('#returnDate').fill('2023-06-01'); // earlier than departure
    await page.locator('#destination').fill('USA');
    await page.locator('#reason').selectOption('vacation');
    await page.locator('#tripForm button[type="submit"]').click();

    expect(dialogMessage).toContain('Return date cannot be before departure date');
  });

  test('does not save trip when return date is before departure', async ({ page }) => {
    page.once('dialog', async (dialog) => dialog.dismiss());

    await page.locator('#departureDate').fill('2023-06-10');
    await page.locator('#returnDate').fill('2023-06-01');
    await page.locator('#destination').fill('USA');
    await page.locator('#reason').selectOption('vacation');
    await page.locator('#tripForm button[type="submit"]').click();

    // Modal should still be open (trip was not saved)
    await expect(page.locator('#tripModal')).toHaveClass(/active/);
  });
});

// ---------------------------------------------------------------------------
// Editing Trips
// ---------------------------------------------------------------------------
test.describe('Trips - Edit Trip', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, SINGLE_TRIP);
    await page.goto('/');
    await goToTrips(page);
  });

  test('shows existing trip in the list', async ({ page }) => {
    await expect(page.locator('.trip-item')).toHaveCount(1);
    await expect(page.locator('.trip-item')).toContainText('France');
  });

  test('clicking edit button opens modal with trip data pre-filled', async ({ page }) => {
    // Click the edit (pencil) button on the first trip item
    await page.locator('.trip-item .btn-secondary').first().click();

    await expect(page.locator('#tripModal')).toHaveClass(/active/);
    await expect(page.locator('#modalTitle')).toHaveText('Edit Trip');
    await expect(page.locator('#destination')).toHaveValue('France');
    await expect(page.locator('#departureDate')).toHaveValue('2023-03-10');
  });

  test('editing a trip updates it in the list', async ({ page }) => {
    await page.locator('.trip-item .btn-secondary').first().click();

    await page.locator('#destination').fill('Spain');
    await page.locator('#tripForm button[type="submit"]').click();

    await expect(page.locator('.trip-item')).toContainText('Spain');
    await expect(page.locator('.trip-item')).not.toContainText('France');
  });

  test('editing does not create a duplicate trip', async ({ page }) => {
    await page.locator('.trip-item .btn-secondary').first().click();
    await page.locator('#destination').fill('Spain');
    await page.locator('#tripForm button[type="submit"]').click();

    await expect(page.locator('.trip-item')).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// Deleting Trips
// ---------------------------------------------------------------------------
test.describe('Trips - Delete Trip', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await seedLocalStorage(page, SINGLE_TRIP);
    await page.goto('/');
    await goToTrips(page);
  });

  test('clicking delete and confirming removes the trip', async ({ page }) => {
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure');
      await dialog.accept();
    });

    await page.locator('.trip-item .btn-danger').first().click();

    await expect(page.locator('.trip-item')).toHaveCount(0);
    await expect(page.locator('#tripsList .empty-state')).toBeVisible();
  });

  test('dismissing the delete confirmation keeps the trip', async ({ page }) => {
    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    await page.locator('.trip-item .btn-danger').first().click();

    await expect(page.locator('.trip-item')).toHaveCount(1);
  });

  test('deleting a trip removes it from localStorage', async ({ page }) => {
    page.once('dialog', async (dialog) => dialog.accept());
    await page.locator('.trip-item .btn-danger').first().click();

    const trips = await getLocalStorageValue(page, 'citizenship-trips');
    expect(trips).toHaveLength(0);
  });
});
