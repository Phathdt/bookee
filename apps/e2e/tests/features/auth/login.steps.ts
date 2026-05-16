import { Given, Then, When } from '@cucumber/cucumber';
import { LandingPage } from '@page-objects/landing.page';
import type { BrowserWorld } from '@support/world';
import { logger } from '@utils/logger';

// Shared steps "I navigate to the landing page", "I open the register form",
// "I submit a fresh registration", "I should see the authenticated profile
// panel", "I should see a registration error" live in register.steps.ts.

When('I open the login form', async function (this: BrowserWorld) {
  await new LandingPage(this.page).chooseLogin();
});

When('I submit my prior credentials', async function (this: BrowserWorld) {
  const email = String(this.data.email ?? '');
  if (!email) throw new Error('No prior email captured in this.data');
  logger.info({ email }, 'Logging in with prior credentials');
  const page = new LandingPage(this.page);
  await page.fillLogin(email, 'sup3rsecure!');
  await page.submit();
});

When('I submit invalid credentials', async function (this: BrowserWorld) {
  const page = new LandingPage(this.page);
  await page.fillLogin('ghost@bookee.local', 'wrongpass!');
  await page.submit();
});

When('I sign out', async function (this: BrowserWorld) {
  await new LandingPage(this.page).logout();
});

Then('I should see the auth form', async function (this: BrowserWorld) {
  await new LandingPage(this.page).expectNotAuthenticated();
});

Given('I am on the landing page after registration', async function (this: BrowserWorld) {
  // For scenarios that need a fresh registered session as prerequisite. Not
  // wired into a feature yet but kept for future health-check flows.
  await new LandingPage(this.page).navigate();
});
