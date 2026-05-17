import { Then, When } from '@cucumber/cucumber';
import { TripsPage } from '@page-objects/operator/trips.page';
import { OperatorShellPage } from '@page-objects/operator/operator-shell.page';
import { BrowserWorld } from '@support/world';
import { expect } from '@playwright/test';
import { logger } from '@utils/logger';

/** Returns a datetime-local string (YYYY-MM-DDTHH:mm) offset `hoursFromNow` into the future. */
function futureDatetimeLocal(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  // toISOString gives "2027-06-01T08:00:00.000Z"; slice to "2027-06-01T08:00"
  return d.toISOString().slice(0, 16);
}

When('I navigate to the trips module', async function (this: BrowserWorld) {
  await new OperatorShellPage(this.page).gotoTrips();
});

Then('I should see the trips page heading', async function (this: BrowserWorld) {
  await expect(this.page.getByRole('heading', { name: /^trips$/i })).toBeVisible();
});

Then('the bulk create button should be visible', async function (this: BrowserWorld) {
  await new TripsPage(this.page).expectBulkButtonVisible();
});

When('I create a new trip with a seeded route and vehicle', async function (this: BrowserWorld) {
  const departure = futureDatetimeLocal(24); // 24 h from now
  const arrival = futureDatetimeLocal(30); // 30 h from now (6 h trip)

  logger.info({ departure, arrival }, 'Creating trip');

  const tripsPage = new TripsPage(this.page);
  await tripsPage.openCreateDialog();
  await tripsPage.fillCreate({
    routeId: 1, // first seeded route
    vehiclePlate: '51', // fragment matching seeded vehicle plates (seeded as 51B-…)
    departureTime: departure,
    arrivalTime: arrival,
    basePrice: 150000,
  });
  await tripsPage.submitCreate();

  // Capture the ID of the most recently created trip row for status assertions
  const idCell = this.page.getByRole('cell', { name: /^#\d+$/ }).last();
  const idText = await idCell.innerText();
  this.data.tripId = idText.replace('#', '').trim();
  logger.info({ tripId: this.data.tripId }, 'Captured new trip id');
});

Then(
  'the new trip should appear with status {string}',
  async function (this: BrowserWorld, status: string) {
    const tripId = String(this.data.tripId);
    await new TripsPage(this.page).expectRowStatus(`#${tripId}`, status);
  },
);

When('I cancel the new trip', async function (this: BrowserWorld) {
  const tripId = String(this.data.tripId);
  logger.info({ tripId }, 'Cancelling trip');
  // The "Cancel" transition button appears in the Actions cell of the scheduled row
  await new TripsPage(this.page).clickStatusTransition(`#${tripId}`, 'Cancel');
});

Then(
  'the new trip should show status {string}',
  async function (this: BrowserWorld, status: string) {
    const tripId = String(this.data.tripId);
    await new TripsPage(this.page).expectRowStatus(`#${tripId}`, status);
  },
);
