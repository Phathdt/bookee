import { Then, When } from '@cucumber/cucumber';
import { faker } from '@faker-js/faker';
import { RoutesPage } from '@page-objects/operator/routes.page';
import { OperatorShellPage } from '@page-objects/operator/operator-shell.page';
import { BrowserWorld } from '@support/world';
import { expect } from '@playwright/test';
import { logger } from '@utils/logger';

When('I navigate to the routes module', async function (this: BrowserWorld) {
  await new OperatorShellPage(this.page).gotoRoutes();
});

Then('I should see the routes page heading', async function (this: BrowserWorld) {
  await expect(this.page.getByRole('heading', { name: /^routes$/i })).toBeVisible();
});

When('I create a new route with seeded stations', async function (this: BrowserWorld) {
  const distanceKm = faker.number.int({ min: 10, max: 500 });
  const durationMinutes = faker.number.int({ min: 30, max: 600 });

  const routesPage = new RoutesPage(this.page);
  await routesPage.openCreateDialog();
  await routesPage.fillCreate({
    companyId: 1, // seeded: Phương Trang
    fromStationName: 'Miền Đông', // seeded station
    toStationName: 'Miền Tây', // seeded station
    distanceKm,
    durationMinutes,
  });
  await routesPage.submitCreate();
  logger.info({ distanceKm, durationMinutes }, 'Route created');
});

Then('the new route should appear in the routes table', async function (this: BrowserWorld) {
  // After creation the new route appears as the last row; capture its ID from the cell.
  // We assert the table has at least one row with a "#N" id cell visible.
  await expect(this.page.getByRole('cell', { name: /^#\d+$/ }).last()).toBeVisible();

  // Store the route id for subsequent deletion step
  const idCell = this.page.getByRole('cell', { name: /^#\d+$/ }).last();
  const idText = await idCell.innerText();
  this.data.routeId = idText.replace('#', '').trim();
  logger.info({ routeId: this.data.routeId }, 'Captured new route id');
});

When('I delete the new route', async function (this: BrowserWorld) {
  const routeId = String(this.data.routeId);
  logger.info({ routeId }, 'Deleting route');
  await new RoutesPage(this.page).deleteRow(`#${routeId}`);
});

Then('the new route should not appear in the routes table', async function (this: BrowserWorld) {
  const routeId = String(this.data.routeId);
  await new RoutesPage(this.page).expectRowByIdMissing(routeId);
});
