import { Then, When } from '@cucumber/cucumber';
import { LandingPage } from '@page-objects/landing.page';
import { BrowserWorld } from '@support/world';
import { logger } from '@utils/logger';

Then('the health card should be visible', async function (this: BrowserWorld) {
  await new LandingPage(this.page).expectHealthCardVisible();
});

When('I refresh the health panel', async function (this: BrowserWorld) {
  logger.info('Refreshing health panel');
  await new LandingPage(this.page).refreshHealth();
});
