import { Given } from '@cucumber/cucumber';
import { OperatorLoginPage } from '@page-objects/operator/operator-login.page';
import { BrowserWorld } from '@support/world';
import { logger } from '@utils/logger';

const ADMIN_PHONE = '0900000000';
const ADMIN_PASSWORD = 'admin';

/**
 * Shared step reused by every operator feature.
 * Navigates to /login, fills seeded admin credentials, waits for dashboard.
 */
Given('I am logged in as operator admin', async function (this: BrowserWorld) {
  logger.info('Logging in as operator admin');
  const loginPage = new OperatorLoginPage(this.page);
  await loginPage.login(ADMIN_PHONE, ADMIN_PASSWORD);
  logger.info('Operator admin login complete');
});
