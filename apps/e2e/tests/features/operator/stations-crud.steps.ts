import { Then, When } from '@cucumber/cucumber';
import { faker } from '@faker-js/faker';
import { StationCreateInput, StationsPage } from '@page-objects/operator/stations.page';
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

  // Capture the ID for edit scenarios
  try {
    this.data.stationId = await stationsPage.getRowId(name);
    logger.info({ stationId: this.data.stationId }, 'Captured station id');
  } catch {
    // ID not critical for create/delete flows — log and continue
    logger.warn('Could not capture station id from row');
  }
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

When(
  'I edit the new station with city {string} and lat {float}',
  async function (this: BrowserWorld, city: string, lat: number) {
    const id = String(this.data.stationId ?? '');
    if (!id) throw new Error('stationId not captured; run create step first');
    logger.info({ city, lat, id }, 'Editing station');
    await new StationsPage(this.page).editRow(id, { city, lat });
  },
);

Then(
  'the station city {string} should be visible in the table',
  async function (this: BrowserWorld, city: string) {
    await new StationsPage(this.page).expectRowVisible(city);
  },
);

When('I search stations for {string}', async function (this: BrowserWorld, text: string) {
  logger.info({ text }, 'Searching stations');
  await new StationsPage(this.page).search(text);
});

Then(
  'the station {string} should be visible in results',
  async function (this: BrowserWorld, name: string) {
    await new StationsPage(this.page).expectRowVisible(name);
  },
);

Then(
  'the station {string} should not be visible in results',
  async function (this: BrowserWorld, name: string) {
    await new StationsPage(this.page).expectRowHidden(name);
  },
);

When(
  'I attempt to create a station with lat {float}',
  async function (this: BrowserWorld, lat: number) {
    const stationsPage = new StationsPage(this.page);
    await stationsPage.openCreateDialog();
    const input: StationCreateInput = {
      name: `E2E ${faker.string.alphanumeric(6)}`,
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      lat,
      lng: 106.6,
    };
    logger.info({ lat }, 'Attempting create with out-of-range lat');
    await stationsPage.fillCreate(input);
    // Submit but expect dialog to stay open due to validation error
    await stationsPage.submitCreateExpectError();
  },
);

Then('the station form should show a validation error', async function (this: BrowserWorld) {
  await new StationsPage(this.page).expectFormError();
});
