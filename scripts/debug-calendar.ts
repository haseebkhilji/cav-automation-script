/**
 * Debug script: inspect the calendar modal DOM structure
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
  const isEmailVisible = await emailInput.isVisible().catch(() => false);
  if (!isEmailVisible) {
    await page.locator('a:has-text("Sign in"), button:has-text("Sign in")').first().click();
    await page.waitForLoadState('domcontentloaded');
  }
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(process.env.CAVAGO_USERNAME ?? '');
  await page.locator('input[type="password"], input[placeholder*="password" i]').first().fill(process.env.CAVAGO_PASSWORD ?? '');
  await page.locator('button:has-text("Sign in")').filter({ hasNotText: /with|as|up|host|customer/i }).first().click();
  await page.waitForURL((url: URL) => !url.pathname.includes('authentication') && !url.pathname.includes('login'), { timeout: 20000 });

  // Navigate to activity
  await page.goto('https://cavago.com/hosts/cavago-riding-club-crc-759/activities/demo-dressage-arena-hire-rider-profile-25304', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  // Click STARTING DATE
  await page.locator('text=STARTING DATE').first().click();
  await page.waitForTimeout(1500);

  // Inspect the modal calendar DOM
  const modal = page.locator('.ant-modal.datePicker-Modal, .ant-modal:has-text("Select Start Date")');
  await modal.waitFor({ state: 'visible', timeout: 10000 });

  // Dump the inner HTML of the calendar panel
  const innerHTML = await modal.evaluate((el: Element): string => {
    return el.innerHTML.substring(0, 5000);
  });
  console.log('=== MODAL INNER HTML (first 5000 chars) ===');
  console.log(innerHTML);

  // Also find all date-like elements
  const dateElements = await modal.evaluate((el: Element) => {
    const all = el.querySelectorAll('td, [class*="cell"], [class*="date"], [class*="day"]');
    const results: Array<{ tag: string; cls: string; text: string; title: string }> = [];
    all.forEach((e, i) => {
      if (i < 30) {
        results.push({
          tag: e.tagName,
          cls: (e.className || '').toString().substring(0, 120),
          text: (e.textContent || '').substring(0, 20),
          title: e.getAttribute('title') || '',
        });
      }
    });
    return results;
  });
  console.log('\n=== DATE ELEMENTS ===');
  console.log(JSON.stringify(dateElements, null, 2));

  await browser.close();
})();
