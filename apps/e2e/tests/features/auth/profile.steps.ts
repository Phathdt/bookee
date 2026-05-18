import { Then, When } from '@cucumber/cucumber';
import { LandingPage } from '@page-objects/landing.page';
import { BrowserWorld } from '@support/world';
import { logger } from '@utils/logger';

When('I rename my profile to {string}', async function (this: BrowserWorld, newName: string) {
  logger.info({ newName }, 'Renaming profile');
  await new LandingPage(this.page).renameProfile(newName);
});

Then(
  'the profile name {string} should be visible',
  async function (this: BrowserWorld, name: string) {
    await new LandingPage(this.page).expectProfileNameVisible(name);
  },
);

When('I click profile sign out', async function (this: BrowserWorld) {
  await new LandingPage(this.page).clickProfileSignout();
});
