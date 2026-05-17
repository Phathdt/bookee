import { TimeoutValue } from '@config/test.config';
import { getOperatorAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

/**
 * Operator CMS login page (/login).
 * Uses shadcn Form with a single "Phone or Email" identifier field + password.
 *
 * Usage:
 *   const login = new OperatorLoginPage(page);
 *   await login.navigate();
 *   await login.fillCredentials('0900000000', 'admin');
 *   await login.submit();
 *   await login.expectLoggedIn();
 */
export class OperatorLoginPage {
  constructor(private readonly page: Page) {}

  // ---- locators ----------------------------------------------------------

  private get identifierInput() {
    return this.page.getByLabel(/phone or email/i);
  }

  private get passwordInput() {
    return this.page.getByLabel(/^password$/i);
  }

  private get submitButton() {
    return this.page.getByRole('button', { name: /^sign in$/i });
  }

  // ---- actions -----------------------------------------------------------

  async navigate(): Promise<void> {
    await this.page.goto(getOperatorAppUrl(URLS.ROUTES.OPERATOR_LOGIN), {
      waitUntil: 'domcontentloaded',
      timeout: TimeoutValue.NAVIGATION,
    });
  }

  async fillCredentials(phone: string, password: string): Promise<void> {
    await this.identifierInput.fill(phone);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async login(phone: string, password: string): Promise<void> {
    await this.navigate();
    await this.fillCredentials(phone, password);
    await this.submit();
    await this.expectLoggedIn();
  }

  // ---- assertions --------------------------------------------------------

  async expectLoggedIn(): Promise<void> {
    // After successful login the router navigates to /, which renders Dashboard.
    await expect(this.page).toHaveURL(
      new RegExp(`${URLS.OPERATOR_APP.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`),
      { timeout: TimeoutValue.ACTION },
    );
    await expect(this.page.getByRole('heading', { name: /dashboard/i })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  async expectError(): Promise<void> {
    // sonner toast appears at the top of the viewport with role="status"
    await expect(
      this.page.getByText(/login failed|check your credentials|invalid/i).first(),
    ).toBeVisible({ timeout: TimeoutValue.ACTION });
  }
}
