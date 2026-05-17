import { Given, Then, When } from '@cucumber/cucumber';
import { OperatorLoginPage } from '@page-objects/operator/operator-login.page';
import { BrowserWorld } from '@support/world';
import { logger } from '@utils/logger';

Given('I navigate to the operator login page', async function (this: BrowserWorld) {
  logger.info('Navigating to operator CMS login page');
  await new OperatorLoginPage(this.page).navigate();
});

When(
  'I submit operator credentials {string} and password {string}',
  async function (this: BrowserWorld, identifier: string, password: string) {
    logger.info({ identifier }, 'Submitting operator credentials');
    const loginPage = new OperatorLoginPage(this.page);
    await loginPage.fillCredentials(identifier, password);
    await loginPage.submit();
  },
);

Then('I should be redirected to the operator dashboard', async function (this: BrowserWorld) {
  await new OperatorLoginPage(this.page).expectLoggedIn();
});

Then('I should see an operator login error', async function (this: BrowserWorld) {
  await new OperatorLoginPage(this.page).expectError();
});
