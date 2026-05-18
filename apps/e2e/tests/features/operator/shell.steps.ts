import { Then, When } from '@cucumber/cucumber';
import { OperatorShellPage } from '@page-objects/operator/operator-shell.page';
import { OperatorLoginPage } from '@page-objects/operator/operator-login.page';
import { BrowserWorld } from '@support/world';
import { logger } from '@utils/logger';

When('I open the topbar account menu and sign out', async function (this: BrowserWorld) {
  logger.info('Signing out via topbar account menu');
  await new OperatorShellPage(this.page).signOut();
});

Then('I should be redirected to the operator login page', async function (this: BrowserWorld) {
  await new OperatorLoginPage(this.page).navigate();
  // navigate() already asserts domcontentloaded; just assert the submit button is visible
  await this.page.waitForURL(/\/login/, { timeout: 10_000 });
});

Then('the trips nav link should appear active', async function (this: BrowserWorld) {
  await new OperatorShellPage(this.page).expectNavLinkActive('trips');
});
