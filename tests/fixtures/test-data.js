/**
 * Reusable test data fixtures for the Canadian Citizenship Tracker tests.
 *
 * All fixtures use fixed historical dates (no isCurrent: true) so calculation
 * results are deterministic regardless of when the tests run.
 *
 * Target date is always 2025-01-01 → eligibility window: 2020-01-01 → 2025-01-01
 */

const TARGET_DATE = '2025-01-01';

/**
 * Empty state - no settings, no trips.
 * Expected: 0 days in Canada, 1,095 remaining, 0.0% progress.
 */
const EMPTY = {
  trips: [],
  settings: {},
};

/**
 * Single PR period: 2022-01-01 → 2022-12-31 (364 days within window).
 * Expected: daysInCanada = 364, daysRemaining = 731, progress = 33.2%
 *
 * Calculation:
 *   overlapStart = 2022-01-01, overlapEnd = 2022-12-31
 *   dayCount = ceil((Dec31 - Jan1) / ms) = ceil(364) = 364 prDays
 *   daysInCanada = 364 + 0 (no temporary) = 364
 */
const PR_ONLY = {
  trips: [],
  settings: {
    targetDate: TARGET_DATE,
    residencyPeriods: [
      {
        startDate: '2022-01-01',
        endDate: '2022-12-31',
        status: 'pr',
        isCurrent: false,
      },
    ],
  },
};

/**
 * Single Temporary period: same dates as PR_ONLY.
 * Expected: daysInCanada = 182, daysRemaining = 913, progress = 16.6%
 *
 * Calculation:
 *   temporaryDays = 364
 *   temporaryCredit = min(365, 364 * 0.5) = min(365, 182) = 182
 */
const TEMPORARY_ONLY = {
  trips: [],
  settings: {
    targetDate: TARGET_DATE,
    residencyPeriods: [
      {
        startDate: '2022-01-01',
        endDate: '2022-12-31',
        status: 'temporary',
        isCurrent: false,
      },
    ],
  },
};

/**
 * Temporary period long enough to hit the 365-day credit cap (3 full years).
 * Expected: daysInCanada = 365, daysRemaining = 730, progress = 33.3%
 *
 * Calculation:
 *   Date('2022-12-31') - Date('2020-01-01') = 1095 days (2020 is leap year)
 *   temporaryCredit = min(365, 1095 * 0.5) = min(365, 547.5) = 365
 */
const TEMPORARY_CAPPED = {
  trips: [],
  settings: {
    targetDate: TARGET_DATE,
    residencyPeriods: [
      {
        startDate: '2020-01-01',
        endDate: '2022-12-31',
        status: 'temporary',
        isCurrent: false,
      },
    ],
  },
};

/**
 * Single Absence period: same dates as PR_ONLY.
 * Expected: daysInCanada = 0, daysRemaining = 1,095, progress = 0.0%
 */
const ABSENCE_ONLY = {
  trips: [],
  settings: {
    targetDate: TARGET_DATE,
    residencyPeriods: [
      {
        startDate: '2022-01-01',
        endDate: '2022-12-31',
        status: 'absence',
        isCurrent: false,
      },
    ],
  },
};

/**
 * Mixed periods: Temporary then PR (realistic history).
 *
 * Periods:
 *   Temporary: 2020-01-01 → 2021-06-30
 *   PR:        2021-07-01 → 2024-06-30
 *
 * Temporary days in window (2020-01-01 to 2021-06-30):
 *   Date('2021-06-30') - Date('2020-01-01') = ?
 *   2020 (leap): Jan 1 to Dec 31 = 365 days; 2021: Jan 1 to Jun 30 = 181 days → 546 total
 *   temporaryCredit = min(365, 546 * 0.5) = min(365, 273) = 273
 *
 * PR days in window (2021-07-01 to 2024-06-30):
 *   Date('2024-06-30') - Date('2021-07-01') = ?
 *   2021 Jul-Dec: 184 days; 2022: 365; 2023: 365; 2024 Jan-Jun: 182 → total 1096... hmm
 *   Actually: 2024-06-30 - 2021-07-01 = let's say approximately 1095 days (close to 3 years)
 *   PR credit: prDays (full credit, capped by 1095 overall requirement)
 *
 * Total daysInCanada = prDays + 273 → will be > 1095, so 100% progress
 */
const MIXED_PERIODS = {
  trips: [],
  settings: {
    targetDate: TARGET_DATE,
    residencyPeriods: [
      {
        startDate: '2020-01-01',
        endDate: '2021-06-30',
        status: 'temporary',
        isCurrent: false,
      },
      {
        startDate: '2021-07-01',
        endDate: '2024-06-30',
        status: 'pr',
        isCurrent: false,
      },
    ],
  },
};

/**
 * Trip-based data (Simple/Legacy mode - no residency periods).
 * Uses prDate + trip records to calculate days.
 *
 * Two trips totalling 20 days outside Canada.
 */
const TRIPS_WITH_PR = {
  trips: [
    {
      id: 1001,
      departureDate: '2023-07-01',
      returnDate: '2023-07-11',
      destination: 'United States',
      reason: 'vacation',
      otherReason: '',
    },
    {
      id: 1002,
      departureDate: '2024-01-15',
      returnDate: '2024-01-25',
      destination: 'Mexico',
      reason: 'vacation',
      otherReason: '',
    },
  ],
  settings: {
    targetDate: TARGET_DATE,
    prDate: '2021-01-01',
    residencyPeriods: [],
  },
};

/**
 * A single trip used for CRUD tests.
 */
const SINGLE_TRIP = {
  trips: [
    {
      id: 2001,
      departureDate: '2023-03-10',
      returnDate: '2023-03-20',
      destination: 'France',
      reason: 'vacation',
      otherReason: '',
    },
  ],
  settings: {},
};

module.exports = {
  TARGET_DATE,
  EMPTY,
  PR_ONLY,
  TEMPORARY_ONLY,
  TEMPORARY_CAPPED,
  ABSENCE_ONLY,
  MIXED_PERIODS,
  TRIPS_WITH_PR,
  SINGLE_TRIP,
};
