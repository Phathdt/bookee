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

When('I filter trips by status {string}', async function (this: BrowserWorld, status: string) {
  logger.info({ status }, 'Setting status filter');
  await new TripsPage(this.page).setStatusFilter(status);
});

Then(
  'only trips with status {string} should be visible',
  async function (this: BrowserWorld, status: string) {
    await new TripsPage(this.page).expectOnlyStatus(status);
  },
);

When('I bulk create trips for route 1 over 2 days', async function (this: BrowserWorld) {
  // Use two adjacent future dates so exactly 2 trips are generated
  const today = new Date();
  const startDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days out
  const endDate = new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000); // +1 day

  const fmt = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

  const tripsPage = new TripsPage(this.page);
  await tripsPage.openBulkDialog();
  await tripsPage.fillBulkCreate({
    routeId: 1,
    vehiclePlate: '51',
    basePrice: 150000,
    startDate: fmt(startDate),
    endDate: fmt(endDate),
    dailyDepartureTime: '08:00',
    tripDurationMinutes: 360,
  });
  logger.info({ startDate: fmt(startDate), endDate: fmt(endDate) }, 'Bulk creating trips');
  await tripsPage.submitBulk();
});

Then(
  'at least one trip row should be visible with status {string}',
  async function (this: BrowserWorld, status: string) {
    await new TripsPage(this.page).expectRowWithStatus(status);
  },
);

When('I open the view dialog for the new trip', async function (this: BrowserWorld) {
  const tripId = String(this.data.tripId);
  logger.info({ tripId }, 'Opening view dialog');
  await new TripsPage(this.page).openViewDialog(tripId);
});

Then('the trip form fields should be disabled', async function (this: BrowserWorld) {
  await new TripsPage(this.page).expectFormDisabled();
});

When(
  'I transition the new trip to {string}',
  async function (this: BrowserWorld, nextStatus: string) {
    const tripId = String(this.data.tripId);
    logger.info({ tripId, nextStatus }, 'Transitioning trip status');
    await new TripsPage(this.page).clickStatusTransition(`#${tripId}`, nextStatus);
  },
);
