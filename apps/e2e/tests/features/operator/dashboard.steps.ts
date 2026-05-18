import { Then, When } from '@cucumber/cucumber';
import { DashboardPage } from '@page-objects/operator/dashboard.page';
import { BrowserWorld } from '@support/world';
import { expect } from '@playwright/test';
import { logger } from '@utils/logger';

// Seeded data produces these 5 module cards on the dashboard
const EXPECTED_DASHBOARD_CARDS = ['stations', 'routes', 'seat-layouts', 'vehicles', 'trips'];

Then('I should see all dashboard overview cards', async function (this: BrowserWorld) {
  const dashboard = new DashboardPage(this.page);
  logger.info({ cards: EXPECTED_DASHBOARD_CARDS }, 'Asserting all dashboard cards visible');
  await dashboard.expectAllCards(EXPECTED_DASHBOARD_CARDS);
});

When('I click the dashboard card {string}', async function (this: BrowserWorld, slug: string) {
  logger.info({ slug }, 'Clicking dashboard card');
  const dashboard = new DashboardPage(this.page);
  await dashboard.navigate();
  await dashboard.clickCard(slug);
});

Then('I should be on the stations page', async function (this: BrowserWorld) {
  await this.page.waitForURL(/\/stations/, { timeout: 10_000 });
  await expect(this.page.getByRole('heading', { name: /^stations$/i })).toBeVisible();
});
