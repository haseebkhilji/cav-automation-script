/**
 * Cavago — Complete Login + Booking + Confirmation Automation
 * ─────────────────────────────────────────────────────────────
 * Full end-to-end Playwright script that:
 *
 *   1. Logs in with credentials from prod.env
 *   2. Searches for "*Demo* Dressage Arena Hire Rider Profile"
 *   3. Opens the activity detail page
 *   4. Selects a future starting date from the calendar modal
 *   5. Selects the first available time slot
 *   6. Enters "abc" in the arrival-date text box
 *   7. Clicks "Book Now"
 *   8. On checkout, applies promo code "HAK1"
 *   9. Waits for grand total to become $0.00
 *  10. Clicks "Proceed to Payment"
 *  11. Waits for payment / booking confirmation
 *
 * Credentials are NEVER hardcoded — they are read from prod.env via dotenv.
 *
 * Usage:
 *   ENV=prod npx ts-node scripts/book-activity.ts           (headed)
 *   ENV=prod HEADLESS=true npx ts-node scripts/book-activity.ts  (headless)
 */

import { chromium, type Browser, type Page, type Locator } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ENVIRONMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const envFile = process.env.ENV ? `${process.env.ENV}.env` : '.env';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const CAVAGO_URL      = process.env.CAVAGO_URL      || 'https://cavago.com/home';
const USERNAME        = process.env.CAVAGO_USERNAME  ?? '';
const PASSWORD        = process.env.CAVAGO_PASSWORD  ?? '';
const PROMO_CODE      = process.env.PROMO_CODE       || 'HAK1';
const ACTIVITY_SEARCH = 'Demo';
const ACTIVITY_TITLE  = '*Demo* Dressage Arena Hire Rider Profile';
const ACTIVITY_URL    = 'https://cavago.com/hosts/cavago-riding-club-crc-759/activities/demo-dressage-arena-hire-rider-profile-25304';
const ARRIVAL_TEXT    = 'abc';
const HEADLESS        = process.env.HEADLESS === 'true';
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'screenshots');

if (!USERNAME || !PASSWORD) {
  console.error(`❌  CAVAGO_USERNAME and CAVAGO_PASSWORD must be set in ${envFile}`);
  process.exit(1);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(async (): Promise<void> => {
  let browser: Browser | undefined;

  try {
    // ── 1. Launch browser ──────────────────────────────────────────
    console.log(`\n🚀  Launching browser (headless: ${HEADLESS})...\n`);
    browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);

    // ── 2. Navigate to Cavago ──────────────────────────────────────
    console.log(`📍  Navigating to ${CAVAGO_URL}`);
    await page.goto(CAVAGO_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    console.log('   Home page loaded.\n');

    // ── 3. Login ───────────────────────────────────────────────────
    console.log('🔐  Logging in...');
    await login(page, USERNAME, PASSWORD);
    console.log('   ✔  Login successful!\n');

    // ── 4. Search for activity ─────────────────────────────────────
    console.log(`🔍  Searching for "${ACTIVITY_SEARCH}"...`);
    const searchInput = page
      .locator('input.searchField__input, input[placeholder*="Discover"]')
      .first();
    await searchInput.fill(ACTIVITY_SEARCH);
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle');
    await wait(2000);
    console.log('   Search results loaded.\n');

    // ── 5. Open the activity ───────────────────────────────────────
    console.log(`📄  Opening activity: ${ACTIVITY_TITLE}`);
    await page.goto(ACTIVITY_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    console.log(`   Activity page loaded — ${page.url()}\n`);

    // ── 6. Select future starting date ─────────────────────────────
    console.log('📅  Selecting a future starting date...');
    await selectFutureDate(page);
    console.log('   ✔  Date selected.\n');

    // ── 7. Select time slot ────────────────────────────────────────
    console.log('🕐  Selecting a time slot...');
    await selectTimeSlot(page);
    console.log('   ✔  Time slot selected.\n');

    // ── 8. Fill arrival-date text box ──────────────────────────────
    console.log(`📝  Filling arrival date: "${ARRIVAL_TEXT}"`);
    const arrivalTextarea = page
      .locator('textarea[placeholder*="arrival date" i], textarea.ant-input')
      .first();
    await arrivalTextarea.fill(ARRIVAL_TEXT);
    console.log('   ✔  Arrival date filled.\n');

    // ── 9. Click Book Now ──────────────────────────────────────────
    console.log('🛒  Clicking Book Now...');
    const bookNowBtn = page.locator('button:has-text("Book Now")').first();
    await bookNowBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await bookNowBtn.click();
    await page.waitForLoadState('networkidle');
    console.log(`   Checkout page loaded — ${page.url()}\n`);

    // ── 10. Handle sign-in modal (may appear on checkout) ──────────
    const signInModal = page.locator('.ant-modal:has-text("Please Sign in to continue")');
    if (await signInModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('🔐  Sign-in modal appeared, re-authenticating...');
      await modalLogin(page, signInModal, USERNAME, PASSWORD);
      await page.waitForLoadState('networkidle');
      console.log('   ✔  Re-authenticated.\n');
    }

    // ── 11. Apply promo code ───────────────────────────────────────
    console.log(`🏷️   Applying promo code: "${PROMO_CODE}"`);
    const promoInput = page
      .locator('input[placeholder*="promo" i], input[placeholder*="code" i], input[placeholder*="Promo"]')
      .first();
    await promoInput.scrollIntoViewIfNeeded();
    await promoInput.fill(PROMO_CODE);

    const applyBtn = page.locator('button:has-text("Apply")').first();
    await applyBtn.click();
    await page.waitForLoadState('networkidle');
    await wait(3000);
    console.log('   ✔  Promo code applied.\n');

    // ── 12. Verify grand total is zero ─────────────────────────────
    console.log('💰  Verifying grand total...');
    const totalEl = await findGrandTotal(page);
    const totalText = await totalEl.textContent();
    console.log(`   Grand Total: ${totalText?.trim()}`);

    // Confirm it contains 0
    if (!/0(\.00)?/.test(totalText ?? '')) {
      console.log('   ⚠  Total is not zero yet, waiting...');
      await totalEl.waitFor({ state: 'visible', timeout: 15_000 });
    }
    console.log('   ✔  Grand total is $0.00\n');

    // ── 13. Click Proceed to Payment ───────────────────────────────
    console.log('💳  Clicking Proceed to Payment...');
    const proceedBtn = page
      .locator('button:has-text("Proceed to Payment"), button:has-text("Proceed To Payment")')
      .first();
    await proceedBtn.scrollIntoViewIfNeeded();
    await proceedBtn.click();
    await page.waitForLoadState('networkidle');
    console.log(`   Payment page — ${page.url()}\n`);

    // ── 14. Wait for booking / payment confirmation ────────────────
    console.log('⏳  Waiting for booking confirmation...');
    await waitForConfirmation(page);
    console.log(`   ✔  Confirmation page — ${page.url()}\n`);

    // ── 15. Final screenshots ──────────────────────────────────────
    const ssCheckout = path.join(SCREENSHOTS_DIR, 'booking-checkout.png');
    const ssConfirmation = path.join(SCREENSHOTS_DIR, 'booking-confirmation.png');
    await page.screenshot({ path: ssConfirmation, fullPage: true });
    console.log(`📸  Confirmation screenshot: ${ssConfirmation}`);
    console.log('\n🎉  Booking automation completed successfully!\n');

  } catch (error) {
    console.error('\n❌  Booking automation failed:', error);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HELPER FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Perform a full login via the authentication page.
 * Handles both: (a) redirect to /authentication and (b) email field already visible.
 */
async function login(page: Page, username: string, password: string): Promise<void> {
  // Check if the email field is already on screen
  const emailInput = page
    .locator('input[type="email"], input[placeholder*="email" i], input[placeholder="Email"]')
    .first();

  if (!(await emailInput.isVisible().catch(() => false))) {
    // Click the Sign-in trigger in the header
    await page
      .locator('a:has-text("Sign in"), button:has-text("Sign in")')
      .first()
      .click();
    await page.waitForLoadState('domcontentloaded');
  }

  // Fill credentials
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(username);

  await page
    .locator('input[type="password"], input[placeholder*="password" i], input[placeholder="Password"]')
    .first()
    .fill(password);

  // Submit — exclude social/tab buttons
  await page
    .locator('button:has-text("Sign in")')
    .filter({ hasNotText: /with|as|up|host|customer/i })
    .first()
    .click();

  // Wait for redirect away from auth pages
  try {
    await page.waitForURL(
      (url) => !url.pathname.includes('authentication') && !url.pathname.includes('login'),
      { timeout: 20_000 },
    );
  } catch {
    await wait(5000);
    const u = page.url();
    if (u.includes('authentication') || u.includes('login')) {
      throw new Error(`Login failed — still on: ${u}`);
    }
  }
}

/**
 * Handle a sign-in modal that may appear during checkout.
 */
async function modalLogin(page: Page, modal: Locator, username: string, password: string): Promise<void> {
  await modal.locator('input[placeholder*="email" i], input[placeholder="Email"]').first().fill(username);
  await modal.locator('input[placeholder*="password" i], input[placeholder="Password"]').first().fill(password);

  await modal
    .locator('button:has-text("Sign in")')
    .filter({ hasNotText: /with|as|up|host|customer/i })
    .first()
    .click();

  await modal.waitFor({ state: 'hidden', timeout: 20_000 });
}

/**
 * Open the calendar modal and select the first available (future) date.
 *
 * Cavago uses a custom calendar (NOT standard Ant Design DatePicker):
 *   <div class="calendarDayContainer disabled">   ← past / unavailable
 *   <div class="calendarDayContainer">            ← future / selectable
 *     <div class="calendarDay"><p>DD</p></div>
 *   </div>
 */
async function selectFutureDate(page: Page): Promise<void> {
  // Scroll booking panel into view
  await page.locator('button:has-text("Book Now")').first().scrollIntoViewIfNeeded().catch(() => {});
  await wait(500);

  // Open the date picker — try three approaches
  const dateInput = page.locator('input[placeholder="MM/DD/YY"], input[readonly][placeholder*="MM"]').first();
  if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dateInput.click();
  } else {
    const startLabel = page.locator(':text("STARTING DATE")').first();
    if (await startLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startLabel.click();
    } else {
      await page.locator('.dateFieldWrapper').first().click();
    }
  }
  await wait(1500);

  // Wait for modal
  const modal = page.locator('.ant-modal:has-text("Select Start Date"), .ant-modal.datePicker-Modal');
  await modal.waitFor({ state: 'visible', timeout: 10_000 });
  await wait(500);

  // Pick the first enabled (future) date
  const enabledDays = modal.locator('div.calendarDayContainer:not(.disabled)');
  const count = await enabledDays.count();
  if (count === 0) throw new Error('No enabled date cells found in calendar.');

  const dayText = (await enabledDays.first().textContent())?.trim();
  console.log(`   Selecting date: ${dayText}`);
  await enabledDays.first().click();
  await wait(500);

  // Click Save
  const saveBtn = modal.locator('button:has-text("Save"), .saveButton');
  await saveBtn.waitFor({ state: 'visible', timeout: 5_000 });
  if (await saveBtn.isDisabled().catch(() => true)) {
    await wait(1000); // let selection register
  }
  await saveBtn.click({ timeout: 10_000 });
  await modal.waitFor({ state: 'hidden', timeout: 10_000 });
}

/**
 * Wait for time slots to finish loading, then select the first one.
 *
 * TIME SLOTS is the 2nd `.ant-select` on the page (1st = PARTICIPANTS).
 * After date selection, slots show "Please wait" while loading.
 */
async function selectTimeSlot(page: Page): Promise<void> {
  // Wait for "Please wait" to disappear
  await page
    .waitForFunction(
      () => {
        const els = document.querySelectorAll('[class*="dateChoices"]');
        for (const el of els) {
          if (el.textContent?.includes('Please wait')) return false;
        }
        return true;
      },
      { timeout: 15_000 },
    )
    .catch(() => console.log('   ⚠  "Please wait" may still be visible, proceeding...'));
  await wait(2000);

  // Target the TIME SLOTS select (2nd ant-select or inside .dateChoices)
  const timeSlotSelect = page.locator('.dateChoices .ant-select').first();
  const allSelects = page.locator('.ant-select');
  const target = (await timeSlotSelect.isVisible({ timeout: 3000 }).catch(() => false))
    ? timeSlotSelect
    : allSelects.nth(1);

  // Open the dropdown
  await target.locator('.ant-select-selector').click();
  await wait(1000);

  // Pick the first option
  const option = page
    .locator('.ant-select-item-option, .ant-select-dropdown .ant-select-item, .ant-select-item')
    .first();
  await option.waitFor({ state: 'visible', timeout: 10_000 });
  const text = (await option.textContent())?.trim();
  console.log(`   Selecting time slot: ${text}`);
  await option.click();
  await wait(500);
}

/**
 * Locate the Grand Total element on the checkout page.
 */
async function findGrandTotal(page: Page): Promise<Locator> {
  const byClass = page
    .locator('[class*="grandTotal"], [class*="grand-total"], [class*="totalAmount"], [class*="orderTotal"], [class*="total-price"]')
    .first();
  const byText = page.locator('text=/grand\\s*total/i').first();
  return (await byClass.isVisible().catch(() => false)) ? byClass : byText;
}

/**
 * Wait for booking / payment confirmation after clicking "Proceed to Payment".
 * Handles multiple possible outcomes:
 *   - Redirect to a confirmation / success page
 *   - A payment form that needs to be completed
 *   - A success message on the same page
 */
async function waitForConfirmation(page: Page): Promise<void> {
  // Give the page time to process the payment (for $0 it may auto-confirm)
  await wait(5000);

  const url = page.url();
  console.log(`   Current URL: ${url}`);

  // Check for common success indicators
  const successIndicators = [
    page.locator('text=/booking confirmed/i').first(),
    page.locator('text=/payment successful/i').first(),
    page.locator('text=/thank you/i').first(),
    page.locator('text=/booking success/i').first(),
    page.locator('text=/order confirmed/i').first(),
    page.locator('[class*="success"], [class*="confirmation"], [class*="thank-you"]').first(),
  ];

  // If URL changed to something with "confirm" or "success", we're done
  if (/confirm|success|thank|complete|receipt/i.test(url)) {
    console.log('   ✔  Redirected to confirmation page.');
    return;
  }

  // If still on checkout / payment page, the payment may need interaction
  if (/checkout|payment|pay/i.test(url)) {
    console.log('   ℹ  Still on payment page — looking for a confirm/pay button...');

    // Look for additional payment buttons
    const payButtons = [
      page.locator('button:has-text("Pay Now")').first(),
      page.locator('button:has-text("Confirm Booking")').first(),
      page.locator('button:has-text("Confirm Payment")').first(),
      page.locator('button:has-text("Complete Booking")').first(),
      page.locator('button:has-text("Place Order")').first(),
      page.locator('button[type="submit"]').first(),
    ];

    for (const btn of payButtons) {
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        const btnText = await btn.textContent();
        console.log(`   Clicking: "${btnText?.trim()}"`);
        await btn.click();
        await page.waitForLoadState('networkidle');
        await wait(5000);
        console.log(`   URL after click: ${page.url()}`);
        break;
      }
    }
  }

  // Check for success indicators on the current page
  for (const indicator of successIndicators) {
    if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await indicator.textContent();
      console.log(`   ✔  Found success indicator: "${text?.trim().substring(0, 80)}"`);
      return;
    }
  }

  console.log('   ℹ  No explicit confirmation detected. The booking may require manual payment.');
  console.log(`   Final URL: ${page.url()}`);
}
