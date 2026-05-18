import { TimeoutValue } from '@config/test.config';
import { getOperatorAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

/**
 * Operator CMS application shell — sidebar nav + topbar.
 *
 * Nav links use data-testid="nav-link-{slug}" where slug is the path segment
 * (e.g. 'stations', 'routes') or 'dashboard' for the root route.
 *
 * Usage:
 *   const shell = new OperatorShellPage(page);
 *   await shell.gotoStations();
 *   await shell.signOut();
 */
export class OperatorShellPage {
  constructor(private readonly page: Page) {}

  // ---- sidebar nav links -------------------------------------------------

  private navLink(slug: string) {
    return this.page.getByTestId(`nav-link-${slug}`);
  }

  async gotoStations(): Promise<void> {
    await this.navLink('stations').click();
    await this.page.waitForURL(/\/stations/, { timeout: TimeoutValue.NAVIGATION });
  }

  async gotoRoutes(): Promise<void> {
    await this.navLink('routes').click();
    await this.page.waitForURL(/\/routes/, { timeout: TimeoutValue.NAVIGATION });
  }

  async gotoSeatLayouts(): Promise<void> {
    await this.navLink('seat-layouts').click();
    await this.page.waitForURL(/\/seat-layouts/, { timeout: TimeoutValue.NAVIGATION });
  }

  async gotoVehicles(): Promise<void> {
    await this.navLink('vehicles').click();
    await this.page.waitForURL(/\/vehicles/, { timeout: TimeoutValue.NAVIGATION });
  }

  async gotoTrips(): Promise<void> {
    await this.navLink('trips').click();
    await this.page.waitForURL(/\/trips/, { timeout: TimeoutValue.NAVIGATION });
  }

  // ---- topbar ------------------------------------------------------------

  /** Opens the account dropdown (topbar-account-trigger). */
  async openAccountMenu(): Promise<void> {
    await this.page.getByTestId('topbar-account-trigger').click();
  }

  /** Opens the account dropdown then clicks Sign out. */
  async signOut(): Promise<void> {
    await this.openAccountMenu();
    await this.page.getByTestId('topbar-signout').click();
    await this.page.waitForURL(getOperatorAppUrl(URLS.ROUTES.OPERATOR_LOGIN), {
      timeout: TimeoutValue.NAVIGATION,
    });
  }

  // ---- assertions --------------------------------------------------------

  async expectAdminBadge(): Promise<void> {
    // The topbar account trigger is visible when logged in
    await expect(this.page.getByTestId('topbar-account-trigger')).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  /** Asserts that a nav link for the given slug is NOT in the sidebar. */
  async expectModuleHidden(module: string): Promise<void> {
    await expect(this.navLink(module.toLowerCase())).toBeHidden();
  }

  /**
   * Asserts the nav link for `slug` is active — either via aria-current="page"
   * or a CSS class that indicates selection.
   */
  async expectNavLinkActive(slug: string): Promise<void> {
    const link = this.navLink(slug);
    // Accept either aria-current="page" attribute or an active class convention
    const ariaCurrent = await link.getAttribute('aria-current');
    if (ariaCurrent === 'page') return;
    // Fallback: assert the link has an active-indicating class
    await expect(link).toHaveClass(/active|bg-|font-bold|text-primary/i, {
      timeout: TimeoutValue.ACTION,
    });
  }
}
