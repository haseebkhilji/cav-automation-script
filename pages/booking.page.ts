import { type Page, type Locator, expect } from '@playwright/test';

export class BookingPage {
  readonly page: Page;

  // ── Search ──────────────────────────────────────────────────────
  readonly searchInput: Locator;

  // ── Activity detail ─────────────────────────────────────────────
  readonly startingDateField: Locator;
  readonly datePickerModal: Locator;
  readonly datePickerSaveBtn: Locator;
  readonly enabledDateCell: Locator;
  readonly timeSlotSelect: Locator;
  readonly arrivalDateTextarea: Locator;
  readonly bookNowButton: Locator;

  // ── Checkout / Promo ────────────────────────────────────────────
  readonly promoCodeInput: Locator;
  readonly promoApplyButton: Locator;
  readonly grandTotalElement: Locator;
  readonly proceedToPaymentButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Search bar on home page
    this.searchInput = page
      .locator('input.searchField__input, input[placeholder*="Discover"]')
      .first();

    // Activity detail — Starting Date trigger (MM/DD/YY placeholder input)
    this.startingDateField = page
      .locator('input[placeholder="MM/DD/YY"], input[readonly][placeholder*="MM"]')
      .first();

    // Date picker modal (custom Cavago implementation, NOT standard Ant Design DatePicker)
    this.datePickerModal = page.locator('.ant-modal:has-text("Select Start Date"), .ant-modal.datePicker-Modal');
    this.datePickerSaveBtn = this.datePickerModal.locator('button:has-text("Save"), .saveButton');

    // Enabled (future) date cells inside the calendar modal
    // Structure: <div class="calendarDayContainer"><div class="calendarDay"><p>DD</p></div></div>
    this.enabledDateCell = this.datePickerModal
      .locator('div.calendarDayContainer:not(.disabled)');

    // Time slot — the 2nd Ant Select component (1st is PARTICIPANTS)
    this.timeSlotSelect = page
      .locator('.dateChoices .ant-select')
      .first();

    // Arrival date textarea
    this.arrivalDateTextarea = page
      .locator('textarea[placeholder*="arrival date" i], textarea.ant-input')
      .first();

    // Book Now CTA
    this.bookNowButton = page
      .locator('button:has-text("Book Now")')
      .first();

    // Checkout — promo code
    this.promoCodeInput = page
      .locator('input[placeholder*="promo" i], input[placeholder*="code" i], input[placeholder*="Promo"]')
      .first();

    this.promoApplyButton = page
      .locator('button:has-text("Apply")')
      .first();

    // Grand Total display
    this.grandTotalElement = page
      .locator('[class*="grandTotal"], [class*="grand-total"], [class*="totalAmount"], [class*="orderTotal"], [class*="total-price"]')
      .first();

    this.proceedToPaymentButton = page
      .locator('button:has-text("Proceed to Payment"), button:has-text("Proceed To Payment")')
      .first();
  }

  // ── Search & open activity ──────────────────────────────────────

  /** Type a query in the home-page search bar and submit */
  async searchActivity(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  /** Click the activity card that matches the given title text */
  async openActivity(title: string): Promise<void> {
    const card = this.page
      .locator('a')
      .filter({ hasText: title })
      .first();
    await card.waitFor({ state: 'visible', timeout: 15000 });
    await card.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Date selection ──────────────────────────────────────────────

  /** Scroll the booking panel into view */
  async scrollBookingPanelIntoView(): Promise<void> {
    await this.bookNowButton.scrollIntoViewIfNeeded().catch(() => {});
  }

  /** Open the date picker modal by clicking the starting date trigger.
   *  Uses three fallback selectors because the DOM structure varies. */
  async openDatePicker(): Promise<void> {
    // Approach 1: MM/DD/YY placeholder input
    const dateInput = this.startingDateField;
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.click();
    } else {
      // Approach 2: STARTING DATE label
      const startLabel = this.page.locator(':text("STARTING DATE")').first();
      if (await startLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startLabel.click();
      } else {
        // Approach 3: dateFieldWrapper
        await this.page.locator('.dateFieldWrapper').first().click();
      }
    }
    await this.page.waitForTimeout(1500);
    await this.datePickerModal.waitFor({ state: 'visible', timeout: 10000 });
  }

  /** Select the first available (future) date from the calendar */
  async selectFirstAvailableDate(): Promise<void> {
    const dayText = await this.enabledDateCell.first().textContent();
    await this.enabledDateCell.first().click();
    await this.page.waitForTimeout(500);
    await this.datePickerSaveBtn.click({ timeout: 10000 });
    await this.datePickerModal.waitFor({ state: 'hidden', timeout: 10000 });
  }

  // ── Time slot selection ─────────────────────────────────────────

  /** Wait for time slots to finish loading ("Please wait" disappears) */
  async waitForTimeSlotsToLoad(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const els = document.querySelectorAll('[class*="dateChoices"]');
        for (const el of els) {
          if (el.textContent?.includes('Please wait')) return false;
        }
        return true;
      },
      { timeout: 15000 }
    );
  }

  /** Open the time slot dropdown and pick the first available option */
  async selectFirstTimeSlot(): Promise<void> {
    await this.timeSlotSelect.locator('.ant-select-selector').click();
    await this.page.waitForTimeout(1000);

    const option = this.page
      .locator('.ant-select-item-option, .ant-select-dropdown .ant-select-item')
      .first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    await this.page.waitForTimeout(500);
  }

  // ── Arrival date text ───────────────────────────────────────────

  /** Fill the arrival date textarea */
  async fillArrivalDate(text: string): Promise<void> {
    await this.arrivalDateTextarea.fill(text);
  }

  // ── Book Now ────────────────────────────────────────────────────

  /** Click the Book Now button and wait for navigation */
  async clickBookNow(): Promise<void> {
    await this.bookNowButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.bookNowButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ── Checkout helpers ────────────────────────────────────────────

  /** Enter a promo code and click Apply */
  async applyPromoCode(code: string): Promise<void> {
    await this.promoCodeInput.scrollIntoViewIfNeeded();
    await this.promoCodeInput.fill(code);
    await this.promoApplyButton.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  /** Wait until the grand total reaches zero */
  async waitForZeroTotal(): Promise<void> {
    // Try CSS-class locator first, fall back to text search
    const isVisible = await this.grandTotalElement.isVisible({ timeout: 5000 }).catch(() => false);
    const target = isVisible
      ? this.grandTotalElement
      : this.page.locator('text=/grand\\s*total/i').first();
    await expect(target).toBeVisible({ timeout: 15000 });
    await expect(target).toHaveText(/0(\.00)?/, { timeout: 15000 });
  }

  /** Click the Proceed to Payment button */
  async clickProceedToPayment(): Promise<void> {
    await this.proceedToPaymentButton.scrollIntoViewIfNeeded();
    await this.proceedToPaymentButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Take a full-page screenshot */
  async takeScreenshot(filePath: string): Promise<void> {
    await this.page.screenshot({ path: filePath, fullPage: true });
  }
}
