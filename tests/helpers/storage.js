/**
 * localStorage helpers for seeding and reading app state in Playwright tests.
 *
 * The app reads localStorage on page load (in CitizenshipTracker.loadData()).
 * Use addInitScript to inject data BEFORE the app's scripts execute.
 */

/**
 * Seeds localStorage with trip and/or settings data before the page loads.
 * Must be called before page.goto().
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ trips?: object[], settings?: object }} data
 */
async function seedLocalStorage(page, data) {
  await page.addInitScript(({ trips, settings }) => {
    if (trips !== undefined) {
      localStorage.setItem('citizenship-trips', JSON.stringify(trips));
    }
    if (settings !== undefined) {
      localStorage.setItem('citizenship-settings', JSON.stringify(settings));
    }
  }, data);
}

/**
 * Clears all app localStorage keys before the page loads.
 * Ensures a clean state (equivalent to first-time user).
 *
 * @param {import('@playwright/test').Page} page
 */
async function clearLocalStorage(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('citizenship-trips');
    localStorage.removeItem('citizenship-settings');
  });
}

/**
 * Reads a parsed localStorage value after the page has loaded.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'citizenship-trips' | 'citizenship-settings'} key
 * @returns {Promise<object | null>}
 */
async function getLocalStorageValue(page, key) {
  return page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  }, key);
}

/**
 * Blocks all Firebase network requests so tests run in complete offline/local mode.
 * Call this before page.goto() or in beforeEach.
 *
 * @param {import('@playwright/test').Page} page
 */
async function blockFirebase(page) {
  // Firebase SDK from Google's CDN
  await page.route('https://www.gstatic.com/firebasejs/**', (route) => route.abort());
  // Firebase Auth / Firestore API calls
  await page.route('https://identitytoolkit.googleapis.com/**', (route) => route.abort());
  await page.route('https://securetoken.googleapis.com/**', (route) => route.abort());
  await page.route('https://firestore.googleapis.com/**', (route) => route.abort());
  await page.route('https://*.firebaseapp.com/**', (route) => route.abort());
  await page.route('https://*.firebaseio.com/**', (route) => route.abort());
}

module.exports = { seedLocalStorage, clearLocalStorage, getLocalStorageValue, blockFirebase };
