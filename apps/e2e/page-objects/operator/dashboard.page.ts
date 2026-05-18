import { TimeoutValue } from '@config/test.config';
import { getOperatorAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

/**
 * Operator CMS dashboard page object.
 *
 * Usage:
 *   const dashboard = new DashboardPage(page);
 *   await dashboard.navigate();
 *   await dashboard.expectCardVisible('stations');
 *   await dashboard.clickCard('stations');
 */
export class DashboardPage {
  constructor(private readonly page: Page) {}

  // ---- locators ----------------------------------------------------------

  private card(slug: string) {
    return this.page.getByTestId(`dashboard-card-${slug}`);
  }

  // ---- actions -----------------------------------------------------------

  async navigate(): Promise<void> {
    await this.page.goto(getOperatorAppUrl(URLS.ROUTES.OPERATOR_DASHBOARD), {
      waitUntil: 'domcontentloaded',
      timeout: TimeoutValue.NAVIGATION,
    });
    await expect(this.page.getByRole('heading', { name: /dashboard/i })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  /** Clicks a dashboard card by slug (e.g. 'stations', 'routes'). */
  async clickCard(slug: string): Promise<void> {
    await this.card(slug).click();
  }

  // ---- assertions --------------------------------------------------------

  async expectCardVisible(slug: string): Promise<void> {
    await expect(this.card(slug)).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  async expectAllCards(slugs: string[]): Promise<void> {
    for (const slug of slugs) {
      await this.expectCardVisible(slug);
    }
  }
}
