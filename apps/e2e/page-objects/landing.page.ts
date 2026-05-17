import { TimeoutValue } from '@config/test.config';
import { getAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

/**
 * Bookee user-web landing page. Hosts the inline AuthDemo (register/login
 * forms + protected profile panel) — there is no separate /login route yet.
 *
 * Locators are placeholder-based to survive copy tweaks without breaking.
 */
export class LandingPage {
  constructor(private readonly page: Page) {}

  // ---- locators ----------------------------------------------------------

  private get registerTab() {
    return this.page.getByRole('button', { name: /^register$/i });
  }
  private get loginTab() {
    return this.page.getByRole('button', { name: /^sign in$/i });
  }
  private get nameInput() {
    return this.page.getByPlaceholder(/họ và tên|name/i);
  }
  private get phoneInput() {
    return this.page.getByPlaceholder(/số điện thoại|phone/i);
  }
  private get emailInput() {
    return this.page.getByPlaceholder(/^email$/i);
  }
  private get passwordInput() {
    return this.page.getByPlaceholder(/password/i);
  }
  private get submitButton() {
    return this.page.getByRole('button', { name: /^(tạo tài khoản|đăng nhập)$/i });
  }
  private get profileHeading() {
    return this.page.getByText(/authenticated profile/i);
  }
  private get logoutButton() {
    return this.page.getByRole('button', { name: /sign out/i });
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
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async fillLogin(identifier: string, password: string): Promise<void> {
    await this.emailInput.fill(identifier);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  // ---- assertions --------------------------------------------------------

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/$/);
    await expect(this.page.getByRole('heading', { name: /bookee/i })).toBeVisible();
  }

  async expectAuthenticated(): Promise<void> {
    await expect(this.profileHeading).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  async expectNotAuthenticated(): Promise<void> {
    await expect(this.submitButton).toBeVisible({ timeout: TimeoutValue.ACTION });
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
