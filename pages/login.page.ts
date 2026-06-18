import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // Locators
  readonly signInButton: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitLoginButton: Locator;
  readonly loggedInIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Sign-in trigger in header (only when login form is NOT already visible)
    this.signInButton = page
      .locator('a:has-text("Sign in"), a:has-text("Log in"), button:has-text("Sign in"), button:has-text("Log in")')
      .first();

    // Credential fields
    this.emailInput = page
      .locator('input[type="email"], input[placeholder*="email" i], input[name="email"], input[name="username"]')
      .first();

    this.passwordInput = page
      .locator('input[type="password"], input[placeholder*="password" i], input[name="password"]')
      .first();

    // Submit button — the primary "Sign in →" CTA (excludes social buttons & tabs)
    this.submitLoginButton = page
      .locator('button:has-text("Sign in"), button:has-text("Log in")')
      .filter({ hasNotText: /with|as|up|host|customer/i })
      .first();

    // Post-login indicators (profile avatar, user menu, logout link, account area)
    this.loggedInIndicator = page
      .locator(
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
      )
      .first();
  }

  /** Navigate to the Cavago home page */
  async navigateToHome(): Promise<void> {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        return;
      } catch (error) {
        if (attempt === maxRetries) {
          throw new Error(`Failed to navigate to home page after ${maxRetries} attempts: ${error.message}`);
        }
        console.warn(`[Navigation] Attempt ${attempt} failed. Retrying in 10 seconds... Error: ${error.message}`);
        await this.page.waitForTimeout(10000);
      }
    }
  }

  /** Click the Sign In / Log In trigger, or skip if the login form is already visible */
  async clickLoginOrSignIn(): Promise<void> {
    // If the email field is already visible, we're on the auth page — no click needed
    try {
      await this.emailInput.waitFor({ state: 'visible', timeout: 3000 });
      return;
    } catch {
      // Email field not visible — click the sign-in trigger
      await this.signInButton.click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
    }
  }

  /** Fill the email / username field */
  async enterUsername(username: string): Promise<void> {
    await this.emailInput.fill(username);
  }

  /** Fill the password field */
  async enterPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /** Submit the login form */
  async submitLogin(): Promise<void> {
    await this.submitLoginButton.click();
  }

  /** Assert that login succeeded (URL moved away from authentication page) */
  async verifyLoginSuccess(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/authentication|\/login|\/signin|\/sign-in/i, { timeout: 20000 });
  }

  /** Assert that a logged-in UI element is visible */
  async verifyLoggedInIndicator(): Promise<void> {
    await expect(this.loggedInIndicator).toBeVisible({ timeout: 15000 });
  }

  /** Save a full-page screenshot to the given path */
  async capturePostLoginScreenshot(screenshotPath: string): Promise<void> {
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
  }
}
