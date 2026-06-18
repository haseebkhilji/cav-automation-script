/**
 * Cavago Login Automation Script
 * --------------------------------
 * Standalone Playwright script that performs the full login flow on cavago.com
 * and captures a post-login screenshot.
 *
 * Usage:
 *   ENV=prod npx ts-node scripts/login.ts
 *   ENV=prod HEADLESS=true npx ts-node scripts/login.ts
 */

import { chromium, type Browser, type Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// ── Load environment ────────────────────────────────────────────────
const envFile = process.env.ENV ? `${process.env.ENV}.env` : '.env';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

const CAVAGO_URL = process.env.CAVAGO_URL || 'https://cavago.com/home';
const USERNAME = process.env.CAVAGO_USERNAME ?? '';
const PASSWORD = process.env.CAVAGO_PASSWORD ?? '';

if (!USERNAME || !PASSWORD) {
  console.error('ERROR: CAVAGO_USERNAME and CAVAGO_PASSWORD must be set in', envFile);
  process.exit(1);
}

const HEADLESS = process.env.HEADLESS === 'true';
const SCREENSHOT_PATH = path.resolve(__dirname, '..', 'screenshots', 'login-success.png');

// ── Helper: wait ────────────────────────────────────────────────────
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Main login flow ─────────────────────────────────────────────────
async function login(): Promise<void> {
  let browser: Browser | undefined;

  try {
    // 1. Launch browser
    console.log(`Launching browser (headless: ${HEADLESS})...`);
    browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page: Page = await context.newPage();

    // 2. Navigate to Cavago
    console.log(`Navigating to ${CAVAGO_URL}...`);
    await page.goto(CAVAGO_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    console.log('Home page loaded.');

    // 3. Check if login form is already visible, otherwise click Sign In
    const emailInput = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[name="email"]'
    ).first();

    const isEmailVisible = await emailInput.isVisible().catch(() => false);

    if (!isEmailVisible) {
      console.log('Clicking Sign In button...');
      const signInTrigger = page.locator(
        'a:has-text("Sign in"), a:has-text("Log in"), button:has-text("Sign in"), button:has-text("Log in")'
      ).first();
      await signInTrigger.click();
      await page.waitForLoadState('networkidle');
    }

    // 4. Wait for email field
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Login form is visible.');

    // 5. Enter email
    console.log(`Entering email: ${USERNAME}`);
    await emailInput.fill(USERNAME);

    // 6. Enter password
    console.log('Entering password...');
    const passwordInput = page.locator(
      'input[type="password"], input[placeholder*="password" i], input[name="password"]'
    ).first();
    await passwordInput.fill(PASSWORD);

    // 7. Click the submit button (excludes social login & tab buttons)
    console.log('Clicking Sign In submit button...');
    const submitButton = page
      .locator('button:has-text("Sign in"), button:has-text("Log in")')
      .filter({ hasNotText: /with|as|up|host|customer/i })
      .first();
    await submitButton.click();

    // 8. Wait for redirect away from authentication page
    console.log('Waiting for authentication redirect...');
    await page.waitForURL(
      (url) => !url.pathname.includes('authentication') && !url.pathname.includes('login'),
      { timeout: 20000 }
    );
    console.log(`Redirected to: ${page.url()}`);

    // 9. Verify login success — URL should not contain auth-related paths
    const currentUrl = page.url();
    if (/\/authentication|\/login|\/signin|\/sign-in/i.test(currentUrl)) {
      throw new Error(`Login appears to have failed. Still on: ${currentUrl}`);
    }
    console.log('Login successful!');

    // 10. Verify a logged-in indicator is visible
    const loggedInIndicator = page.locator(
      [
        '[aria-label*="profile" i]',
        '[aria-label*="account" i]',
        '[aria-label*="user" i]',
        '[data-testid*="user" i]',
        '[data-testid*="avatar" i]',
        'a:has-text("Logout")',
        'a:has-text("Log out")',
        'a:has-text("Sign out")',
        'button:has-text("Logout")',
        'button:has-text("Log out")',
        '[class*="avatar"]',
        '[class*="user-menu"]',
        '[class*="userMenu"]',
        '[class*="profile"]',
      ].join(', ')
    ).first();

    await loggedInIndicator.waitFor({ state: 'visible', timeout: 15000 });
    console.log('Logged-in indicator is visible.');

    // 11. Capture post-login screenshot
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    console.log(`Screenshot saved to: ${SCREENSHOT_PATH}`);

    // 12. Done
    await wait(2000);
    console.log('\nLogin automation completed successfully.');
  } catch (error) {
    console.error('Login automation failed:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

login();
