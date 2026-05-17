import { Then, When } from '@cucumber/cucumber';
import { faker } from '@faker-js/faker';
import { StationsPage } from '@page-objects/operator/stations.page';
import { OperatorShellPage } from '@page-objects/operator/operator-shell.page';
import { BrowserWorld } from '@support/world';
import { expect } from '@playwright/test';
import { logger } from '@utils/logger';

When('I navigate to the stations module', async function (this: BrowserWorld) {
  await new OperatorShellPage(this.page).gotoStations();
});

Then('I should see the stations page heading', async function (this: BrowserWorld) {
  await expect(this.page.getByRole('heading', { name: /^stations$/i })).toBeVisible();
});

When('I create a new station with generated data', async function (this: BrowserWorld) {
  const name = `E2E ${faker.string.alphanumeric(6)}`;
  const address = faker.location.streetAddress();
  const city = faker.location.city();
  const lat = faker.location.latitude({ min: 8, max: 23 });
  const lng = faker.location.longitude({ min: 102, max: 110 });

  this.data.stationName = name;
  logger.info({ name, city }, 'Creating station');

  const stationsPage = new StationsPage(this.page);
  await stationsPage.openCreateDialog();
  await stationsPage.fillCreate({ name, address, city, lat, lng });
  await stationsPage.submitCreate();
});

Then('the new station should appear in the stations table', async function (this: BrowserWorld) {
  const name = String(this.data.stationName);
  await new StationsPage(this.page).expectRow(name);
});

When('I delete the new station', async function (this: BrowserWorld) {
  const name = String(this.data.stationName);
  logger.info({ name }, 'Deleting station');
  await new StationsPage(this.page).deleteRow(name);
});

Then(
  'the new station should not appear in the stations table',
  async function (this: BrowserWorld) {
    const name = String(this.data.stationName);
    await new StationsPage(this.page).expectRowMissing(name);
  },
);
