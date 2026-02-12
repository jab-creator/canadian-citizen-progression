# Test Data Files

These JSON files can be imported into the Canadian Citizenship Tracker for testing different scenarios.

## How to Use

1. Open the Canadian Citizenship Tracker application
2. Go to the **Data** tab
3. Click **"Import Data"**
4. Select one of the test data JSON files below
5. The data will be loaded into the application

---

## Available Test Files

### 1. `test-data-simple-mode.json` - Simple Mode (Legacy)
**Scenario**: Basic PR with trips only

**Setup**:
- PR Date: June 15, 2021
- Target Date: November 12, 2024
- 4 trips recorded
- Uses legacy calculation mode (PR date + trips)

**Expected Result**:
- Approximately 1,200+ days in Canada (depends on trip calculation)
- Simple tracking for users who only need to track trips
- No residency periods used

**Use Case**: Best for testing the original/legacy functionality

---

### 2. `test-data.json` - Advanced Mode (Study Permit → PR)
**Scenario**: Student who became a PR

**Setup**:
- Residency Periods:
  - **2019-01-15 to 2021-03-20**: Temporary status (Study permit) - 795 days
  - **2021-03-21 to 2024-11-12**: PR status - 1,332 days
- Target Date: November 12, 2024
- No PR date set (using periods instead)
- No trips (absences tracked in periods)

**Expected Result**:
- Temporary days: 795 × 0.5 = 397.5 → **365 credited days** (capped)
- PR days: 1,332 × 1.0 = **1,332 credited days**
- **Total: 1,697 days** ✅ (exceeds 1,095 requirement)
- Progress: 155% (shows as 100% in UI, capped)
- **Eligible for citizenship!**

**Use Case**: Testing temporary resident credit calculation and maximum cap

---

### 3. `test-data-complex-absences.json` - Extended Absence
**Scenario**: PR with extended absence period

**Setup**:
- Residency Periods:
  - **2019-11-12 to 2022-06-30**: PR status - 961 days
  - **2022-07-01 to 2023-12-31**: Absence (lived outside Canada) - 549 days
  - **2024-01-01 to 2024-11-12**: PR status - 317 days
- Target Date: November 12, 2024
- No PR date set (using periods instead)

**Expected Result**:
- PR days: 961 + 317 = **1,278 days**
- Absence days: 549 days (no credit)
- Uncovered days: ~35 days (gap)
- **Total: 1,278 days** ✅ (exceeds 1,095 requirement)
- Progress: 117%
- **Eligible for citizenship despite extended absence!**

**Use Case**: Testing absence period handling and gap calculation

---

## Testing Checklist

After importing each test file, verify:

### Dashboard Tab
- [ ] **Days in Canada** shows correct value
- [ ] **Days Remaining** calculated correctly (max 0 if over 1,095)
- [ ] **Progress %** displays accurately
- [ ] **Total Trips** count is correct
- [ ] **Days Outside** calculated properly
- [ ] Progress bar fills to correct percentage
- [ ] Countdown timer shows correct eligibility date

### Trips Tab (Simple Mode only)
- [ ] All trips display in the list
- [ ] Trip details are correct (dates, destination, reason)
- [ ] Can edit trips
- [ ] Can delete trips
- [ ] Trip validation works (return after departure)

### Settings Tab
- [ ] PR Date field shows correct value (or empty for advanced mode)
- [ ] Target Date field shows correct value
- [ ] Residency Status dropdown shows correct selection
- [ ] Residency Periods display correctly (if applicable)
- [ ] Period dates and statuses are accurate
- [ ] Can add new periods
- [ ] Can remove periods
- [ ] Validation prevents overlaps
- [ ] Validation ensures dates in 5-year window

### Data Tab
- [ ] Export Data creates valid JSON
- [ ] Exported JSON matches imported data
- [ ] Re-importing exported data works
- [ ] Data persists after refresh

### Share Feature (if using Firebase)
- [ ] Can generate share link
- [ ] Share link shows correct progress
- [ ] Share link displays accurate days in Canada
- [ ] Share link doesn't expose personal trip details

---

## Creating Your Own Test Data

### JSON Structure

```json
{
  "trips": [
    {
      "id": "unique-id",
      "departureDate": "YYYY-MM-DD",
      "returnDate": "YYYY-MM-DD",
      "destination": "Country",
      "reason": "Purpose"
    }
  ],
  "settings": {
    "prDate": "YYYY-MM-DD",  // Leave empty for advanced mode
    "targetDate": "YYYY-MM-DD",
    "residencyStatus": "permanent|temporary|protected",
    "residencyPeriods": [
      {
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "status": "pr|temporary|absence"
      }
    ]
  }
}
```

### Tips
1. **Simple Mode**: Set `prDate`, leave `residencyPeriods` empty `[]`
2. **Advanced Mode**: Leave `prDate` empty `""`, populate `residencyPeriods`
3. **Don't mix modes**: Using both will confuse the calculation
4. **Date format**: Always use `YYYY-MM-DD` format
5. **Status values**: 
   - Residency status: `permanent`, `temporary`, `protected`
   - Period status: `pr`, `temporary`, `absence`

---

## Troubleshooting

### Import Fails
- Check JSON syntax (use a JSON validator)
- Ensure all dates are in YYYY-MM-DD format
- Verify all required fields are present

### Wrong Calculations
- Check that periods don't overlap
- Verify dates are within 5-year window
- Ensure using only one mode (simple OR advanced)
- Check that temporary credit cap (365 days) is applied

### Validation Errors
- Ensure end dates are after start dates
- Check for overlapping periods
- Verify dates are within 5 years of target date
- Make sure all required fields are filled

---

## Need More Test Scenarios?

Create additional test files for:
- Multiple study/work permits before PR
- Gaps in residency timeline
- Maximum temporary credits (>730 temporary days)
- Just barely meeting requirements (1,095 days exactly)
- Not yet eligible (<1,095 days)
- Multiple short absences vs one long absence

Feel free to modify these files or create new ones for your specific testing needs!
