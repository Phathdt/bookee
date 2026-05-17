import { Then, When } from '@cucumber/cucumber';
import { faker } from '@faker-js/faker';
import { VehiclesPage } from '@page-objects/operator/vehicles.page';
import { OperatorShellPage } from '@page-objects/operator/operator-shell.page';
import { BrowserWorld } from '@support/world';
import { logger } from '@utils/logger';

When('I navigate to the vehicles module', async function (this: BrowserWorld) {
  await new OperatorShellPage(this.page).gotoVehicles();
});

When('I create a new vehicle with generated data', async function (this: BrowserWorld) {
  // Generate a unique plate so we can identify this row later
  const plate = `E2E-${faker.string.alphanumeric(6).toUpperCase()}`;
  this.data.vehiclePlate = plate;
  logger.info({ plate }, 'Creating vehicle');

  const vehiclesPage = new VehiclesPage(this.page);
  await vehiclesPage.openCreateDialog();
  await vehiclesPage.fillCreate({
    companyId: 1, // seeded: Phương Trang
    plateNumber: plate,
    type: 'Sleeper',
    seatLayoutName: 'Giường nằm', // seeded layout name fragment
    totalSeats: 34,
  });
  await vehiclesPage.submitCreate();
});

Then('the new vehicle should appear in the vehicles table', async function (this: BrowserWorld) {
  const plate = String(this.data.vehiclePlate);
  await new VehiclesPage(this.page).expectRow(plate);
});

When('I delete the new vehicle', async function (this: BrowserWorld) {
  const plate = String(this.data.vehiclePlate);
  logger.info({ plate }, 'Deleting vehicle');
  await new VehiclesPage(this.page).deleteRow(plate);
});

Then(
  'the new vehicle should not appear in the vehicles table',
  async function (this: BrowserWorld) {
    const plate = String(this.data.vehiclePlate);
    await new VehiclesPage(this.page).expectRowMissing(plate);
  },
);
