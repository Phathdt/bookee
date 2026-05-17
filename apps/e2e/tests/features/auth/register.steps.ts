import { Given, Then, When } from '@cucumber/cucumber';
import { faker } from '@faker-js/faker';
import { LandingPage } from '@page-objects/landing.page';
import { BrowserWorld } from '@support/world';
import { logger } from '@utils/logger';

const DUPE_EMAIL = 'admin@bookee.local'; // seeded admin — always present after `prisma db seed`

Given('I navigate to the landing page', async function (this: BrowserWorld) {
  logger.info('Navigating to landing page');
  await new LandingPage(this.page).navigate();
});

When('I open the register form', async function (this: BrowserWorld) {
  await new LandingPage(this.page).chooseRegister();
});

When('I submit a fresh registration', async function (this: BrowserWorld) {
  const email = faker.internet.email().toLowerCase();
  const phone = `0900${faker.string.numeric(6)}`;
  const password = 'sup3rsecure!';
  this.data.email = email;
  logger.info({ email, phone }, 'Submitting fresh registration');
  const page = new LandingPage(this.page);
  await page.fillRegister(faker.person.fullName(), phone, email, password);
  await page.submit();
});

When('I register with a known taken email', async function (this: BrowserWorld) {
  const phone = `0900${faker.string.numeric(6)}`;
  logger.info({ email: DUPE_EMAIL }, 'Submitting registration with duplicate email');
  const page = new LandingPage(this.page);
  await page.fillRegister(faker.person.fullName(), phone, DUPE_EMAIL, 'sup3rsecure!');
  await page.submit();
});

Then('I should see the authenticated profile panel', async function (this: BrowserWorld) {
  await new LandingPage(this.page).expectAuthenticated();
});

Then('I should see a registration error', async function (this: BrowserWorld) {
  await new LandingPage(this.page).expectErrorVisible();
});
