import { TimeoutValue } from '@config/test.config';
import { getAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

/**
 * Bookee user-web landing page. Hosts the inline AuthDemo (register/login
 * forms + protected profile panel) — there is no separate /login route yet.
 *
 * Locators use data-testid attributes for stability.
 */
export class LandingPage {
  constructor(private readonly page: Page) {}

  // ---- locators ----------------------------------------------------------

  private get registerTab() {
    return this.page.getByTestId('auth-demo-mode-register');
  }
  private get loginTab() {
    return this.page.getByTestId('auth-demo-mode-login');
  }
  private get nameInput() {
    return this.page.getByTestId('register-name-input');
  }
  private get phoneInput() {
    return this.page.getByTestId('register-phone-input');
  }
  private get registerEmailInput() {
    return this.page.getByTestId('register-email-input');
  }
  private get registerPasswordInput() {
    return this.page.getByTestId('register-password-input');
  }
  private get registerSubmitButton() {
    return this.page.getByTestId('register-submit');
  }
  private get loginIdentifierInput() {
    return this.page.getByTestId('login-identifier-input');
  }
  private get loginPasswordInput() {
    return this.page.getByTestId('login-password-input');
  }
  private get loginSubmitButton() {
    return this.page.getByTestId('login-submit');
  }
  private get profileSignoutButton() {
    return this.page.getByTestId('profile-signout');
  }

  // ---- actions -----------------------------------------------------------

  async navigate(): Promise<void> {
    await this.page.goto(getAppUrl(URLS.ROUTES.LANDING), {
      waitUntil: 'domcontentloaded',
      timeout: TimeoutValue.NAVIGATION,
    });
  }

  async chooseRegister(): Promise<void> {
    await this.registerTab.click();
  }

  async chooseLogin(): Promise<void> {
    await this.loginTab.click();
  }

  async fillRegister(name: string, phone: string, email: string, password: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.phoneInput.fill(phone);
    await this.registerEmailInput.fill(email);
    await this.registerPasswordInput.fill(password);
  }

  async fillLogin(identifier: string, password: string): Promise<void> {
    await this.loginIdentifierInput.fill(identifier);
    await this.loginPasswordInput.fill(password);
  }

  async submit(): Promise<void> {
    // Determine which form is active and click its submit button
    const registerSubmitVisible = await this.registerSubmitButton.isVisible().catch(() => false);
    if (registerSubmitVisible) {
      await this.registerSubmitButton.click();
    } else {
      await this.loginSubmitButton.click();
    }
  }

  async logout(): Promise<void> {
    await this.profileSignoutButton.click();
  }

  // ---- assertions --------------------------------------------------------

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/$/);
    await expect(this.page.getByRole('heading', { name: /bookee/i })).toBeVisible();
  }

  async expectAuthenticated(): Promise<void> {
    await expect(this.profileSignoutButton).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  async expectNotAuthenticated(): Promise<void> {
    // Either the login or register submit button should be visible
    const loginVisible = this.loginSubmitButton;
    await expect(loginVisible).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  async expectEmailDisplayed(email: string): Promise<void> {
    await expect(this.page.getByText(email)).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  async expectErrorVisible(): Promise<void> {
    await expect(
      this.page.getByText(/invalid|incorrect|failed|registered|already/i).first(),
    ).toBeVisible({ timeout: TimeoutValue.ACTION });
  }
}
