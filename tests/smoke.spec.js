// @ts-check
const { test, expect } = require('@playwright/test');
const { blockFirebase, clearLocalStorage } = require('./helpers/storage');

/**
 * Smoke Tests
 *
 * Verify that the application loads and its core structure is present.
 * These tests run without any seed data to confirm the zero-state UI.
 */
test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await clearLocalStorage(page);
    await page.goto('/');
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Canadian Citizenship Tracker');
  });

  test('app header is visible with correct text', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Canadian Citizenship Tracker');
  });

  test('all four navigation tabs are present', async ({ page }) => {
    await expect(page.locator('[data-tab="dashboard"]')).toBeVisible();
    await expect(page.locator('[data-tab="trips"]')).toBeVisible();
    await expect(page.locator('[data-tab="settings"]')).toBeVisible();
    await expect(page.locator('[data-tab="data"]')).toBeVisible();
  });

  test('dashboard tab is active by default', async ({ page }) => {
    await expect(page.locator('[data-tab="dashboard"]')).toHaveClass(/active/);
  });

  test('all five stat cards are visible on dashboard', async ({ page }) => {
    await expect(page.locator('#daysInCanada')).toBeVisible();
    await expect(page.locator('#daysRemaining')).toBeVisible();
    await expect(page.locator('#progressPercent')).toBeVisible();
    await expect(page.locator('#totalTrips')).toBeVisible();
    await expect(page.locator('#totalTripDays')).toBeVisible();
  });

  test('progress bar is present', async ({ page }) => {
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('#progressFill')).toBeVisible();
    await expect(page.locator('#progressText')).toBeVisible();
  });

  test('countdown section is present', async ({ page }) => {
    await expect(page.locator('#countdown')).toBeVisible();
    await expect(page.locator('#countdownDays')).toBeVisible();
    await expect(page.locator('#countdownHours')).toBeVisible();
    await expect(page.locator('#countdownMinutes')).toBeVisible();
    await expect(page.locator('#countdownSeconds')).toBeVisible();
  });

  test('sign in button is visible when not authenticated', async ({ page }) => {
    // Cloud section shows sign-in when Firebase is unavailable / not authenticated
    await expect(page.locator('#signInSection')).toBeVisible();
  });

  test('clicking each tab switches content without errors', async ({ page }) => {
    const tabs = ['trips', 'settings', 'data', 'dashboard'];

    for (const tab of tabs) {
      await page.locator(`[data-tab="${tab}"]`).click();
      await expect(page.locator(`[data-tab="${tab}"]`)).toHaveClass(/active/);
    }
  });

  test('no JavaScript errors on load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Navigate fresh and wait briefly for scripts to settle
    await page.goto('/');
    await page.waitForTimeout(500);

    // Filter out known Firebase network errors (expected when Firebase is blocked)
    const unexpectedErrors = errors.filter(
      (msg) => !msg.includes('firebase') && !msg.includes('Failed to fetch') && !msg.includes('net::ERR_')
    );
    expect(unexpectedErrors).toHaveLength(0);
  });
});
