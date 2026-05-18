import { Then, When } from '@cucumber/cucumber';
import { faker } from '@faker-js/faker';
import { VehiclesPage } from '@page-objects/operator/vehicles.page';
import { OperatorShellPage } from '@page-objects/operator/operator-shell.page';
import { BrowserWorld } from '@support/world';
import { logger } from '@utils/logger';

// Helper to navigate to vehicles and get the page object
function vehiclesPage(world: BrowserWorld): VehiclesPage {
  return new VehiclesPage(world.page);
}

When('I navigate to the vehicles module', async function (this: BrowserWorld) {
  await new OperatorShellPage(this.page).gotoVehicles();
});

When('I create a new vehicle with generated data', async function (this: BrowserWorld) {
  // Generate a unique plate so we can identify this row later
  const plate = `E2E-${faker.string.alphanumeric(6).toUpperCase()}`;
  this.data.vehiclePlate = plate;
  logger.info({ plate }, 'Creating vehicle');

  const vp = vehiclesPage(this);
  await vp.openCreateDialog();
  await vp.fillCreate({
    companyId: 1, // seeded: Phương Trang
    plateNumber: plate,
    type: 'Sleeper',
    seatLayoutName: 'Giường nằm', // seeded layout name fragment
    totalSeats: 34,
  });
  await vp.submitCreate();

  // Capture vehicle ID for edit scenario
  try {
    this.data.vehicleId = await vp.getLastRowId();
    logger.info({ vehicleId: this.data.vehicleId }, 'Captured vehicle id');
  } catch {
    logger.warn('Could not capture vehicle id');
  }
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
    await vehiclesPage(this).expectRowMissing(plate);
  },
);

When(
  'I edit the new vehicle plate to {string} and total seats to {int}',
  async function (this: BrowserWorld, newPlate: string, totalSeats: number) {
    const id = String(this.data.vehicleId ?? '');
    if (!id) throw new Error('vehicleId not captured; run create step first');
    logger.info({ id, newPlate, totalSeats }, 'Editing vehicle');
    await vehiclesPage(this).editRow(id, { plateNumber: newPlate, totalSeats });
    this.data.vehiclePlate = newPlate;
  },
);

Then(
  'the vehicle {string} should appear in the vehicles table',
  async function (this: BrowserWorld, plate: string) {
    await vehiclesPage(this).expectRow(plate);
  },
);

When('I delete the edited vehicle', async function (this: BrowserWorld) {
  const plate = String(this.data.vehiclePlate);
  logger.info({ plate }, 'Deleting edited vehicle');
  await vehiclesPage(this).deleteRow(plate);
});

Then(
  'the vehicle {string} should not appear in the vehicles table',
  async function (this: BrowserWorld, plate: string) {
    await vehiclesPage(this).expectRowMissing(plate);
  },
);
