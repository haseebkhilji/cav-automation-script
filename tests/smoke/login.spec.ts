import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { env } from '../../utils/env';
import * as path from 'path';

test.describe('Cavago Login — Smoke Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  // ------------------------------------------------------------------
  test('TC-01: Verify Cavago home page opens successfully', async ({ page }) => {
    await loginPage.navigateToHome();

    // The page should load and contain "cavago" somewhere in the URL
    await expect(page).toHaveURL(/cavago/i);
    // The page should have a non-empty title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  // ------------------------------------------------------------------
  test('TC-02: Verify login / sign-in option is visible', async ({ page }) => {
    await loginPage.navigateToHome();

    await expect(loginPage.signInButton).toBeVisible({ timeout: 10000 });
  });

  // ------------------------------------------------------------------
  test('TC-03: Login with credentials, verify authentication, and capture screenshot', async ({ page }) => {
    // Step 1 — Navigate to home
    await loginPage.navigateToHome();

    // Step 2 — Open the login form
    await loginPage.clickLoginOrSignIn();

    // Step 3 — Enter credentials from prod.env
    await loginPage.enterUsername(env.CAVAGO_USERNAME);
    await loginPage.enterPassword(env.CAVAGO_PASSWORD);

    // Step 4 — Submit login
    await loginPage.submitLogin();

    // Step 5 — Wait for redirect away from authentication page
    await page.waitForURL((url) => !url.pathname.includes('authentication') && !url.pathname.includes('login'), {
      timeout: 20000,
    });

    // Step 6 — Verify we are no longer on a login screen
    await loginPage.verifyLoginSuccess();

    // Step 7 — Verify a logged-in indicator is visible
    await loginPage.verifyLoggedInIndicator();

    // Step 8 — Capture post-login screenshot
    const screenshotPath = path.resolve(__dirname, '../../screenshots/login-success.png');
    await loginPage.capturePostLoginScreenshot(screenshotPath);
  });
});
