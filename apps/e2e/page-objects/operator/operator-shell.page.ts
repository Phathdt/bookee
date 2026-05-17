import { TimeoutValue } from '@config/test.config';
import { getOperatorAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

/**
 * Operator CMS application shell — sidebar nav + topbar.
 *
 * Usage:
 *   const shell = new OperatorShellPage(page);
 *   await shell.gotoStations();
 *   await shell.signOut();
 */
export class OperatorShellPage {
  constructor(private readonly page: Page) {}

  // ---- sidebar nav links -------------------------------------------------

  private navLink(label: string) {
    return this.page.getByRole('link', { name: label, exact: true });
  }

  async gotoStations(): Promise<void> {
    await this.navLink('Stations').click();
    await this.page.waitForURL(/\/stations/, { timeout: TimeoutValue.NAVIGATION });
  }

  async gotoRoutes(): Promise<void> {
    await this.navLink('Routes').click();
    await this.page.waitForURL(/\/routes/, { timeout: TimeoutValue.NAVIGATION });
  }

  async gotoSeatLayouts(): Promise<void> {
    await this.navLink('Seat Layouts').click();
    await this.page.waitForURL(/\/seat-layouts/, { timeout: TimeoutValue.NAVIGATION });
  }

  async gotoVehicles(): Promise<void> {
    await this.navLink('Vehicles').click();
    await this.page.waitForURL(/\/vehicles/, { timeout: TimeoutValue.NAVIGATION });
  }

  async gotoTrips(): Promise<void> {
    await this.navLink('Trips').click();
    await this.page.waitForURL(/\/trips/, { timeout: TimeoutValue.NAVIGATION });
  }

  // ---- topbar ------------------------------------------------------------

  /** Opens the account dropdown then clicks Sign out. */
  async signOut(): Promise<void> {
    // The topbar trigger is a ghost button that contains the user id + role badge.
    await this.page
      .getByRole('button', { name: /account|id \d+/i })
      .first()
      .click();
    await this.page.getByRole('menuitem', { name: /sign out/i }).click();
    await this.page.waitForURL(getOperatorAppUrl(URLS.ROUTES.OPERATOR_LOGIN), {
      timeout: TimeoutValue.NAVIGATION,
    });
  }

  // ---- assertions --------------------------------------------------------

  async expectAdminBadge(): Promise<void> {
    // The topbar renders a <Badge> with the user's role label.
    await expect(this.page.getByRole('button', { name: /admin/i }).first()).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  /** Asserts that a nav link labelled `module` is NOT in the sidebar. */
  async expectModuleHidden(module: string): Promise<void> {
    await expect(this.navLink(module)).toBeHidden();
  }
}
