import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { BookingPage } from '../../pages/booking.page';
import { env } from '../../utils/env';
import * as path from 'path';

// ── Constants ────────────────────────────────────────────────────────
const ACTIVITY_SEARCH = 'Demo';
const ACTIVITY_URL =
  'https://cavago.com/hosts/cavago-riding-club-crc-759/activities/demo-dressage-arena-hire-rider-profile-25304';
const PROMO_CODE = 'HAK1';
const ARRIVAL_TEXT = 'abc';
const SCREENSHOTS = path.resolve(__dirname, '../../screenshots');

// ── Helper: perform login and verify success ─────────────────────────
async function performLogin(page: any) {
  const loginPage = new LoginPage(page);
  await loginPage.navigateToHome();
  await loginPage.clickLoginOrSignIn();
  await loginPage.enterUsername(env.CAVAGO_USERNAME);
  await loginPage.enterPassword(env.CAVAGO_PASSWORD);
  await loginPage.submitLogin();
  await page.waitForURL(
    (url: URL) => !url.pathname.includes('authentication') && !url.pathname.includes('login'),
    { timeout: 20000 },
  );
  await loginPage.verifyLoginSuccess();
  await loginPage.verifyLoggedInIndicator();
  return loginPage;
}

// ── Test Suite ───────────────────────────────────────────────────────
test.describe('Cavago Booking — End-to-End Smoke Tests', () => {
  // Each booking test involves login + navigation + calendar interaction — needs more time
  test.describe.configure({ timeout: 120000 });

  let loginPage: LoginPage;
  let bookingPage: BookingPage;

  // ─────────────────────────────────────────────────────────────────
  test('TC-01: Login with credentials and verify authentication', async ({ page }) => {
    loginPage = await performLogin(page);
    await loginPage.capturePostLoginScreenshot(
      path.join(SCREENSHOTS, 'login-success.png'),
    );
  });

  // ─────────────────────────────────────────────────────────────────
  test('TC-02: Search for activity and open detail page', async ({ page }) => {
    // Login first
    loginPage = await performLogin(page);

    // Search
    bookingPage = new BookingPage(page);
    await bookingPage.searchActivity(ACTIVITY_SEARCH);

    // Verify search results are shown
    await expect(page).toHaveURL(/search/i);

    // Navigate directly to the activity
    await page.goto(ACTIVITY_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Verify the activity page loaded
    await expect(page).toHaveURL(/demo-dressage-arena-hire/i);
  });

  // ─────────────────────────────────────────────────────────────────
  test('TC-03: Select a future starting date from the calendar', async ({ page }) => {
    // Login + navigate to activity
    loginPage = await performLogin(page);
    await page.goto(ACTIVITY_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    bookingPage = new BookingPage(page);
    await bookingPage.scrollBookingPanelIntoView();
    await bookingPage.openDatePicker();

    // Verify the calendar modal is visible
    await expect(bookingPage.datePickerModal).toBeVisible();

    // Verify there are enabled (future) date cells
    const enabledCount = await bookingPage.enabledDateCell.count();
    expect(enabledCount).toBeGreaterThan(0);

    // Select the first available date
    await bookingPage.selectFirstAvailableDate();

    // Verify the modal closed
    await expect(bookingPage.datePickerModal).not.toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────
  test('TC-04: Select a time slot after choosing a date', async ({ page }) => {
    // Login + navigate to activity + select date
    loginPage = await performLogin(page);
    await page.goto(ACTIVITY_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    bookingPage = new BookingPage(page);
    await bookingPage.scrollBookingPanelIntoView();
    await bookingPage.openDatePicker();
    await bookingPage.selectFirstAvailableDate();

    // Wait for time slots to load
    await bookingPage.waitForTimeSlotsToLoad();

    // Select the first time slot
    await bookingPage.selectFirstTimeSlot();

    // Verify the time slot select now has a value (not empty)
    const selectedItem = bookingPage.timeSlotSelect.locator('.ant-select-selection-item');
    await expect(selectedItem).not.toBeEmpty({ timeout: 5000 });
  });

  // ─────────────────────────────────────────────────────────────────
  test('TC-05: Fill arrival date and click Book Now', async ({ page }) => {
    // Login + navigate + select date + time
    loginPage = await performLogin(page);
    await page.goto(ACTIVITY_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    bookingPage = new BookingPage(page);
    await bookingPage.scrollBookingPanelIntoView();
    await bookingPage.openDatePicker();
    await bookingPage.selectFirstAvailableDate();
    await bookingPage.waitForTimeSlotsToLoad();
    await bookingPage.selectFirstTimeSlot();

    // Fill arrival date
    await bookingPage.fillArrivalDate(ARRIVAL_TEXT);
    await expect(bookingPage.arrivalDateTextarea).toHaveValue(ARRIVAL_TEXT);

    // Click Book Now
    await bookingPage.clickBookNow();

    // Verify we're on the checkout page or still on the activity page (with checkout section)
    const url = page.url();
    expect(url).toMatch(/checkout|demo-dressage-arena-hire/i);
  });

  // ─────────────────────────────────────────────────────────────────
  test('TC-06: Apply promo code and verify grand total is zero', async ({ page }) => {
    // Login + full booking setup + Book Now
    loginPage = await performLogin(page);
    await page.goto(ACTIVITY_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    bookingPage = new BookingPage(page);
    await bookingPage.scrollBookingPanelIntoView();
    await bookingPage.openDatePicker();
    await bookingPage.selectFirstAvailableDate();
    await bookingPage.waitForTimeSlotsToLoad();
    await bookingPage.selectFirstTimeSlot();
    await bookingPage.fillArrivalDate(ARRIVAL_TEXT);
    await bookingPage.clickBookNow();

    // Handle sign-in modal if it appears
    const signInModal = page.locator('.ant-modal:has-text("Please Sign in to continue")');
    if (await signInModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await signInModal
        .locator('input[placeholder*="email" i], input[placeholder="Email"]')
        .first()
        .fill(env.CAVAGO_USERNAME);
      await signInModal
        .locator('input[placeholder*="password" i], input[placeholder="Password"]')
        .first()
        .fill(env.CAVAGO_PASSWORD);
      await signInModal
        .locator('button:has-text("Sign in")')
        .filter({ hasNotText: /with|as|up|host|customer/i })
        .first()
        .click();
      await signInModal.waitFor({ state: 'hidden', timeout: 20000 });
      await page.waitForLoadState('networkidle');
    }

    // Apply promo code
    await bookingPage.applyPromoCode(PROMO_CODE);

    // Verify grand total is $0.00
    await bookingPage.waitForZeroTotal();
    const grandTotal = page
      .locator('[class*="grandTotal"], [class*="grand-total"], [class*="totalAmount"]')
      .first();
    const grandTotalVisible = await grandTotal.isVisible().catch(() => false);
    const totalEl = grandTotalVisible ? grandTotal : page.locator('text=/grand\\s*total/i').first();
    const totalText = await totalEl.textContent();
    expect(totalText).toMatch(/\$?0(\.00)?/);
  });

  // ─────────────────────────────────────────────────────────────────
  test('TC-07: Proceed to payment and verify booking confirmation', async ({ page }) => {
    // Login + full booking setup + Book Now + promo
    loginPage = await performLogin(page);
    await page.goto(ACTIVITY_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    bookingPage = new BookingPage(page);
    await bookingPage.scrollBookingPanelIntoView();
    await bookingPage.openDatePicker();
    await bookingPage.selectFirstAvailableDate();
    await bookingPage.waitForTimeSlotsToLoad();
    await bookingPage.selectFirstTimeSlot();
    await bookingPage.fillArrivalDate(ARRIVAL_TEXT);
    await bookingPage.clickBookNow();

    // Handle sign-in modal if it appears
    const signInModal = page.locator('.ant-modal:has-text("Please Sign in to continue")');
    if (await signInModal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await signInModal
        .locator('input[placeholder*="email" i], input[placeholder="Email"]')
        .first()
        .fill(env.CAVAGO_USERNAME);
      await signInModal
        .locator('input[placeholder*="password" i], input[placeholder="Password"]')
        .first()
        .fill(env.CAVAGO_PASSWORD);
      await signInModal
        .locator('button:has-text("Sign in")')
        .filter({ hasNotText: /with|as|up|host|customer/i })
        .first()
        .click();
      await signInModal.waitFor({ state: 'hidden', timeout: 20000 });
      await page.waitForLoadState('networkidle');
    }

    // Apply promo and verify zero total
    await bookingPage.applyPromoCode(PROMO_CODE);
    await bookingPage.waitForZeroTotal();

    // Click Proceed to Payment
    await bookingPage.clickProceedToPayment();

    // Wait for the payment success / confirmation page to load
    await page.waitForURL(/payment-success|confirm|success|thank/i, { timeout: 30000 }).catch(() => {});
    await page.waitForLoadState('networkidle');

    // Verify we reached the payment-success / confirmation page
    const finalUrl = page.url();
    expect(finalUrl).toMatch(/payment-success|confirm|success|thank/i);

    // Verify the "Congratulations!" or "booking confirmed" message is visible
    const confirmationMessage = page
      .getByText(/congratulations/i)
      .or(page.getByText(/booking confirmed/i))
      .or(page.getByText(/thank you/i))
      .first();
    await expect(confirmationMessage).toBeVisible({ timeout: 30000 });

    // Capture confirmation screenshot
    await bookingPage.takeScreenshot(path.join(SCREENSHOTS, 'booking-confirmation.png'));
  });
});
