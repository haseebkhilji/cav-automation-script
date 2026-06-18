# Cavago QA Automation Framework

End-to-end test automation for [Cavago](https://cavago.com) built with **Playwright + TypeScript** and **Allure Reporting**.

Covers the full user journey: **Login → Search Activity → Book → Apply Promo → Checkout → Confirmation**.

---

## Prerequisites

| Requirement        | Minimum Version | Install                                    |
| ------------------ | --------------- | ------------------------------------------ |
| Node.js            | 18+             | https://nodejs.org                         |
| npm                | 9+              | Bundled with Node.js                       |
| Java (for Allure)  | JDK 8+          | `brew install openjdk` or download JDK     |

> **Note:** Allure CLI requires Java. Install via `brew install allure` (macOS) or download from [allure-framework releases](https://github.com/allure-framework/allure2/releases).

---

## Quick Start (3 Steps)

```bash
# 1. Navigate to the project
cd automation-framework

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install
```

---

## Environment Setup

Credentials are stored in environment files at the project root. **Never commit these files.**

### `prod.env` (already provided)

```env
CAVAGO_URL=https://cavago.com/home
CAVAGO_USERNAME=hakkualitatem+1@gmail.com
CAVAGO_PASSWORD=Cavago.123
```

### Using a different environment

Create a new `.env` file (e.g. `staging.env`) with the same keys, then run:

```bash
ENV=staging npx playwright test
```

---

## Project Structure

```
automation-framework/
├── pages/                          # Page Object Model classes
│   ├── login.page.ts               #   Login page locators & actions
│   └── booking.page.ts             #   Booking page locators & actions
├── tests/
│   └── smoke/                      # Smoke test suites
│       ├── login.spec.ts           #   3 login tests
│       └── booking.spec.ts         #   7 booking tests (end-to-end)
├── scripts/                        # Standalone automation scripts
│   ├── login.ts                    #   Login-only script
│   └── book-activity.ts            #   Full booking flow script
├── utils/
│   └── env.ts                      # Environment variable loader
├── screenshots/                    # Captured screenshots
├── prod.env                        # Production credentials (git-ignored)
├── .gitignore                      # Ignores env, results, reports
├── playwright.config.ts            # Playwright configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # npm scripts & dependencies
└── README.md                       # This file
```

---

## Running Tests (Playwright Spec Files)

### Login Smoke Tests (3 tests)

```bash
npm run test              # Headless
npm run test:headed       # Watch in browser
```

| ID    | Description                                                    |
| ----- | -------------------------------------------------------------- |
| TC-01 | Verify Cavago home page opens successfully                     |
| TC-02 | Verify login / sign-in option is visible                       |
| TC-03 | Login with credentials, verify authentication, capture screenshot |

### Booking Tests (7 tests — full end-to-end)

```bash
npm run book:spec              # Headless
npm run book:spec:headed       # Watch in browser
```

| ID    | Description                                                  |
| ----- | ------------------------------------------------------------ |
| TC-01 | Login with credentials and verify authentication             |
| TC-02 | Search for activity and open detail page                     |
| TC-03 | Select a future starting date from the calendar              |
| TC-04 | Select a time slot after choosing a date                     |
| TC-05 | Fill arrival date and click Book Now                         |
| TC-06 | Apply promo code HAK1 and verify grand total is zero         |
| TC-07 | Proceed to payment and verify booking confirmation           |

### Run Everything

```bash
npm run smoke:all           # All 10 tests (login + booking)
```

### Run a Specific Test

```bash
# Run a single test by name
ENV=prod npx playwright test tests/smoke/booking.spec.ts -g "TC-07"

# Run all tests in a file
ENV=prod npx playwright test tests/smoke/booking.spec.ts
```

### Run with Different Options

```bash
# Slow down actions (useful for debugging)
ENV=prod npx playwright test --headed --slow-mo 500

# Run with verbose output
ENV=prod npx playwright test --reporter=line

# Run with Playwright UI mode (interactive debugger)
ENV=prod npx playwright test --ui
```

---

## Running Standalone Scripts

These are single-file scripts (not test specs) that run the full flow in one go.

### Login Script

```bash
npm run login              # Headless
npm run login:headed       # Watch in browser
```

### Full Booking Script

```bash
npm run book               # Headless — login → search → book → promo → payment
npm run book:headed        # Watch in browser
```

The booking script automates:
1. Login with `prod.env` credentials
2. Search for `*Demo* Dressage Arena Hire Rider Profile`
3. Select the first future date from the calendar modal
4. Select the first available time slot
5. Fill `abc` in the arrival date text box
6. Click **Book Now**
7. Apply promo code `HAK1`
8. Wait for grand total to reach `$0.00`
9. Click **Proceed to Payment**
10. Wait for booking confirmation page

---

## Allure Reporting

### Generate HTML Report

```bash
npm run report              # Generates report in allure-report/
npm run report:open         # Opens in browser
npm run report:full         # Generate + open in one step
```

> **Requirement:** Java JDK 8+ must be installed for Allure CLI.

### Playwright HTML Report

After any test run, a static HTML report is generated at `playwright-report/`. Open it manually:

```bash
npx playwright show-report playwright-report
```

---

## Test Output & Artifacts

| Output                  | Location                    | Description                          |
| ----------------------- | --------------------------- | ------------------------------------ |
| Screenshots (success)   | `screenshots/`              | Login & confirmation screenshots     |
| Screenshots (failure)   | `test-results/`             | Auto-captured on test failure        |
| Videos (failure)        | `test-results/`             | Auto-recorded on test failure        |
| Traces (failure)        | `test-results/`             | Playwright trace ZIP for debugging   |
| Allure results          | `allure-results/`           | Raw Allure data (needs report gen)   |
| Playwright report       | `playwright-report/`        | Static HTML test report              |

---

## Troubleshooting

### Tests fail with locator errors
The Cavago UI may have changed. Inspect the page and update selectors in `pages/login.page.ts` or `pages/booking.page.ts`.

### `Cannot find module '@playwright/test'`
Run `npm install` to install all dependencies.

### Calendar / date picker won't open
The Cavago calendar uses a **custom modal** (not standard Ant Design DatePicker). The `openDatePicker()` method uses 3 fallback selectors:
1. `input[placeholder="MM/DD/YY"]`
2. `:text("STARTING DATE")`
3. `.dateFieldWrapper`

If the UI changes, update selectors in `pages/booking.page.ts`.

### Time slots not loading
After selecting a date, time slots show "Please wait" while loading. The framework waits for this to disappear. If it persists, increase the timeout in `waitForTimeSlotsToLoad()`.

### Grand total not reaching zero
The promo code `HAK1` must be valid. If it expires, update `PROMO_CODE` in the test file or add it to `prod.env`:
```env
PROMO_CODE=NEWCODE
```

### Allure report is empty
Run tests **before** generating the report:
```bash
npm run smoke:all          # Run tests first
npm run report:open        # Then generate + open report
```

### Allure CLI not found
```bash
# macOS
brew install allure

# Any platform (via npm)
npm install -g allure-commandline
```

### Credentials not loading
Verify that `prod.env` exists in the project root and tests run with `ENV=prod`:
```bash
ENV=prod npx playwright test
```

### Test timeout exceeded
Booking tests involve login + navigation + calendar interaction. The default timeout is 120 seconds per test. If your network is slow, increase it in `booking.spec.ts`:
```typescript
test.describe.configure({ timeout: 180000 });
```

### Headless mode (CI/CD)
For CI pipelines, the framework auto-detects `CI=true` or `HEADLESS=true`:
```bash
CI=true HEADLESS=true ENV=prod npx playwright test
```

---

## Configuration

### `playwright.config.ts`

| Setting             | Value                        | Override                     |
| ------------------- | ---------------------------- | ---------------------------- |
| Browser             | Chromium                     | Add projects to config       |
| Headless            | `CI=true` or `HEADLESS=true` | `--headed` CLI flag          |
| Viewport            | 1280 × 720                   | Change in config             |
| Action timeout      | 15s                          | Change in config             |
| Navigation timeout  | 30s                          | Change in config             |
| Retries             | 0 (local), 2 (CI)            | Change in config             |
| Workers             | 1                            | Increase for parallel tests  |

### `prod.env`

| Variable            | Description                  | Default                      |
| ------------------- | ---------------------------- | ---------------------------- |
| `CAVAGO_URL`        | Base URL                     | `https://cavago.com/home`    |
| `CAVAGO_USERNAME`   | Login email                  | (required)                   |
| `CAVAGO_PASSWORD`   | Login password               | (required)                   |
| `PROMO_CODE`        | Promo code for booking tests | `HAK1`                       |
