/**
 * Debug: inspect the TIME SLOTS dropdown structure after date selection
 */
import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', 'prod.env') });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  // Login
  await page.goto('https://cavago.com/home', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder="Email"]').first();
  if (!(await emailInput.isVisible().catch(() => false))) {
    await page.locator('a:has-text("Sign in"), button:has-text("Sign in")').first().click();
    await page.waitForLoadState('domcontentloaded');
  }
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(process.env.CAVAGO_USERNAME ?? '');
  await page.locator('input[type="password"], input[placeholder*="password" i]').first().fill(process.env.CAVAGO_PASSWORD ?? '');
  await page.locator('button:has-text("Sign in")').filter({ hasNotText: /with|as|up|host|customer/i }).first().click();
  try { await page.waitForURL((url: URL) => !url.pathname.includes('authentication'), { timeout: 20000 }); } catch { /* ok */ }

  // Go to activity
  await page.goto('https://cavago.com/hosts/cavago-riding-club-crc-759/activities/demo-dressage-arena-hire-rider-profile-25304', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await new Promise(r => setTimeout(r, 2000));

  // Scroll to booking panel
  await page.locator('button:has-text("Book Now")').first().scrollIntoViewIfNeeded().catch(() => {});
  await new Promise(r => setTimeout(r, 500));

  // Click STARTING DATE
  const startLabel = page.locator(':text("STARTING DATE")').first();
  await startLabel.click();
  await new Promise(r => setTimeout(r, 1500));

  // Select date
  const modal = page.locator('.ant-modal:has-text("Select Start Date")');
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  const enabledDays = modal.locator('div.calendarDayContainer:not(.disabled)');
  await enabledDays.first().click();
  await new Promise(r => setTimeout(r, 500));
  await modal.locator('button:has-text("Save"), .saveButton').click({ timeout: 10000 });
  await modal.waitFor({ state: 'hidden', timeout: 10000 });
  console.log('Date selected, modal closed.');

  // Wait for time slots to load
  await new Promise(r => setTimeout(r, 5000));
  
  // Take screenshot
  await page.screenshot({ path: path.resolve(__dirname, '..', 'screenshots', 'debug-timeslot.png'), fullPage: true });
  console.log('Screenshot saved.');

  // Inspect the booking panel DOM
  const bookingPanel = await page.evaluate(() => {
    // Find all elements with class containing "select" or "timeSlot" or "slot"
    const elements = document.querySelectorAll('[class*="select"], [class*="timeSlot"], [class*="Slot"], [class*="dropdown"], [class*="combo"]');
    const results: Array<{ tag: string; cls: string; text: string; children: number }> = [];
    elements.forEach((e, i) => {
      if (i < 30) {
        results.push({
          tag: e.tagName,
          cls: (e.className || '').toString().substring(0, 150),
          text: (e.textContent || '').substring(0, 50),
          children: e.children.length,
        });
      }
    });
    return results;
  });
  console.log('\n=== SELECT/SLOT ELEMENTS ===');
  console.log(JSON.stringify(bookingPanel, null, 2));

  // Also look at the TIME SLOTS section specifically
  const timeSlotsHTML = await page.evaluate(() => {
    const label = Array.from(document.querySelectorAll('p, span, label')).find(el => el.textContent?.includes('TIME SLOTS'));
    if (label) {
      // Get the parent container
      let parent = label.parentElement;
      for (let i = 0; i < 3; i++) {
        if (parent?.parentElement) parent = parent.parentElement;
      }
      return parent?.innerHTML?.substring(0, 3000) || 'not found';
    }
    return 'TIME SLOTS label not found';
  });
  console.log('\n=== TIME SLOTS CONTAINER HTML ===');
  console.log(timeSlotsHTML);

  await browser.close();
})();
