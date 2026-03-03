// @ts-check
const { test, expect } = require('@playwright/test');
const { blockFirebase, clearLocalStorage, seedLocalStorage, getLocalStorageValue } = require('./helpers/storage');
const { PR_ONLY } = require('./fixtures/test-data');

/**
 * Settings Tab Tests
 *
 * Covers the target application date field and the residency timeline
 * (add/remove periods, status types, "current" checkbox behaviour, save).
 */

async function goToSettings(page) {
  await page.locator('[data-tab="settings"]').click();
  await expect(page.locator('#settings-section')).toBeVisible();
}

// ---------------------------------------------------------------------------
// Target Application Date
// ---------------------------------------------------------------------------
test.describe('Settings - Target Date', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
    await goToSettings(page);
  });

  test('target date field is present and empty by default', async ({ page }) => {
    await expect(page.locator('#targetDate')).toBeVisible();
    await expect(page.locator('#targetDate')).toHaveValue('');
  });

  test('Save Settings button is visible', async ({ page }) => {
    await expect(page.locator('#saveSettingsBtn')).toBeVisible();
  });

  test('saving a target date persists it to localStorage', async ({ page }) => {
    await page.locator('#targetDate').fill('2026-06-15');
    await page.locator('#saveSettingsBtn').click();

    const settings = await getLocalStorageValue(page, 'citizenship-settings');
    expect(settings.targetDate).toBe('2026-06-15');
  });

  test('previously saved target date is pre-populated on reload', async ({ page }) => {
    await seedLocalStorage(page, PR_ONLY);
    await page.goto('/');
    await goToSettings(page);

    await expect(page.locator('#targetDate')).toHaveValue('2025-01-01');
  });
});

// ---------------------------------------------------------------------------
// Residency Periods - Basic UI
// ---------------------------------------------------------------------------
test.describe('Settings - Residency Periods UI', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
    await goToSettings(page);
  });

  test('shows empty state when no periods are added', async ({ page }) => {
    await expect(page.locator('#residencyPeriodsContainer .empty-state')).toBeVisible();
  });

  test('Add Period button is present', async ({ page }) => {
    await expect(page.locator('#addResidencyPeriodBtn')).toBeVisible();
  });

  test('clicking Add Period adds a new period row', async ({ page }) => {
    await page.locator('#addResidencyPeriodBtn').click();
    await expect(page.locator('.residency-period-row')).toHaveCount(1);
  });

  test('clicking Add Period twice adds two period rows', async ({ page }) => {
    await page.locator('#addResidencyPeriodBtn').click();
    await page.locator('#addResidencyPeriodBtn').click();
    await expect(page.locator('.residency-period-row')).toHaveCount(2);
  });

  test('new period row has Start Date, End Date, Status and Current fields', async ({ page }) => {
    await page.locator('#addResidencyPeriodBtn').click();
    const row = page.locator('.residency-period-row').first();

    await expect(row.locator('.period-start')).toBeVisible();
    await expect(row.locator('.period-end')).toBeVisible();
    await expect(row.locator('.period-status')).toBeVisible();
    await expect(row.locator('.period-current-checkbox')).toBeVisible();
  });

  test('status dropdown defaults to PR', async ({ page }) => {
    await page.locator('#addResidencyPeriodBtn').click();
    await expect(page.locator('.period-status').first()).toHaveValue('pr');
  });

  test('status dropdown contains PR, Temporary, and Absence options', async ({ page }) => {
    await page.locator('#addResidencyPeriodBtn').click();
    const options = page.locator('.period-status option');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toHaveText('PR');
    await expect(options.nth(1)).toHaveText('Temporary');
    await expect(options.nth(2)).toHaveText('Absence');
  });

  test('remove button deletes the period row', async ({ page }) => {
    await page.locator('#addResidencyPeriodBtn').click();
    await page.locator('.remove-period').first().click();
    await expect(page.locator('.residency-period-row')).toHaveCount(0);
    await expect(page.locator('#residencyPeriodsContainer .empty-state')).toBeVisible();
  });

  test('removing the last period shows the empty state', async ({ page }) => {
    await page.locator('#addResidencyPeriodBtn').click();
    await page.locator('#addResidencyPeriodBtn').click();

    const rows = page.locator('.residency-period-row');
    await expect(rows).toHaveCount(2);

    await page.locator('.remove-period').first().click();
    await expect(rows).toHaveCount(1);

    await page.locator('.remove-period').first().click();
    await expect(rows).toHaveCount(0);
    await expect(page.locator('#residencyPeriodsContainer .empty-state')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Residency Periods - "Current" Checkbox Behaviour
// ---------------------------------------------------------------------------
test.describe('Settings - Current Checkbox', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
    await goToSettings(page);
    await page.locator('#addResidencyPeriodBtn').click();
  });

  test('checking "Current" disables the end date field', async ({ page }) => {
    const row = page.locator('.residency-period-row').first();
    await expect(row.locator('.period-end')).toBeEnabled();

    await row.locator('.period-current-checkbox').check();
    await expect(row.locator('.period-end')).toBeDisabled();
  });

  test('unchecking "Current" re-enables the end date field', async ({ page }) => {
    const row = page.locator('.residency-period-row').first();
    await row.locator('.period-current-checkbox').check();
    await row.locator('.period-current-checkbox').uncheck();
    await expect(row.locator('.period-end')).toBeEnabled();
  });

  test('checking "Current" shows the helper text', async ({ page }) => {
    const row = page.locator('.residency-period-row').first();
    await expect(row.locator('.current-helper')).toBeHidden();

    await row.locator('.period-current-checkbox').check();
    await expect(row.locator('.current-helper')).toBeVisible();
    await expect(row.locator('.current-helper')).toContainText('Through yesterday');
  });

  test('only one period can be marked as Current at a time', async ({ page }) => {
    // Add a second period
    await page.locator('#addResidencyPeriodBtn').click();

    const rows = page.locator('.residency-period-row');
    await expect(rows).toHaveCount(2);

    // Check first row
    await rows.first().locator('.period-current-checkbox').check();
    await expect(rows.first().locator('.period-current-checkbox')).toBeChecked();

    // Check second row — first should auto-uncheck
    await rows.last().locator('.period-current-checkbox').check();
    await expect(rows.last().locator('.period-current-checkbox')).toBeChecked();
    await expect(rows.first().locator('.period-current-checkbox')).not.toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// Residency Periods - Saving
// ---------------------------------------------------------------------------
test.describe('Settings - Save Periods', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
    await goToSettings(page);
  });

  test('saving settings with a valid period stores it in localStorage', async ({ page }) => {
    await page.locator('#addResidencyPeriodBtn').click();
    const row = page.locator('.residency-period-row').first();

    await row.locator('.period-start').fill('2023-01-01');
    await row.locator('.period-end').fill('2023-12-31');
    await row.locator('.period-status').selectOption('pr');
    await page.locator('#targetDate').fill('2025-01-01');
    await page.locator('#saveSettingsBtn').click();

    const settings = await getLocalStorageValue(page, 'citizenship-settings');
    expect(settings.residencyPeriods).toHaveLength(1);
    expect(settings.residencyPeriods[0].status).toBe('pr');
    expect(settings.residencyPeriods[0].startDate).toBe('2023-01-01');
  });

  test('saving with missing start date shows an alert', async ({ page }) => {
    let alertMsg = '';
    page.once('dialog', async (dialog) => {
      alertMsg = dialog.message();
      await dialog.dismiss();
    });

    await page.locator('#addResidencyPeriodBtn').click();
    // Leave start date empty, fill end date only
    const row = page.locator('.residency-period-row').first();
    await row.locator('.period-end').fill('2023-12-31');
    await page.locator('#saveSettingsBtn').click();

    expect(alertMsg).toContain('start date');
  });

  test('saving with missing end date (no current checked) shows an alert', async ({ page }) => {
    let alertMsg = '';
    page.once('dialog', async (dialog) => {
      alertMsg = dialog.message();
      await dialog.dismiss();
    });

    await page.locator('#addResidencyPeriodBtn').click();
    const row = page.locator('.residency-period-row').first();
    await row.locator('.period-start').fill('2023-01-01');
    // No end date, no current checkbox
    await page.locator('#saveSettingsBtn').click();

    expect(alertMsg).toContain('end date');
  });

  test('saving period marked as Current (no end date) does not show an error', async ({ page }) => {
    let dialogCalled = false;
    page.once('dialog', async (dialog) => {
      dialogCalled = true;
      await dialog.dismiss();
    });

    await page.locator('#addResidencyPeriodBtn').click();
    const row = page.locator('.residency-period-row').first();
    await row.locator('.period-start').fill('2023-01-01');
    await row.locator('.period-current-checkbox').check();
    await page.locator('#targetDate').fill('2025-01-01');
    await page.locator('#saveSettingsBtn').click();

    expect(dialogCalled).toBe(false);

    const settings = await getLocalStorageValue(page, 'citizenship-settings');
    expect(settings.residencyPeriods[0].isCurrent).toBe(true);
  });

  test('saved periods are re-rendered after page reload', async ({ page }) => {
    await seedLocalStorage(page, PR_ONLY);
    await page.goto('/');
    await goToSettings(page);

    // The PR_ONLY fixture has one residency period — it should be rendered
    await expect(page.locator('.residency-period-row')).toHaveCount(1);
    await expect(page.locator('.period-status').first()).toHaveValue('pr');
  });
});
