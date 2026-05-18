import { TimeoutValue } from '@config/test.config';
import { getOperatorAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

export interface VehicleCreateInput {
  /** Numeric operator/company ID */
  companyId: number;
  plateNumber: string;
  type: string;
  /** Visible layout name fragment for the seat-layout select option */
  seatLayoutName: string;
  totalSeats: number;
}

/**
 * Operator CMS /vehicles page object.
 *
 * Usage:
 *   const vehicles = new VehiclesPage(page);
 *   await vehicles.navigate();
 *   await vehicles.openCreateDialog();
 *   await vehicles.fillCreate({ companyId: 1, plateNumber: '51B-999.99', type: 'Sleeper', seatLayoutName: 'Giường nằm', totalSeats: 34 });
 *   await vehicles.submitCreate();
 *   await vehicles.expectRow('51B-999.99');
 */
export class VehiclesPage {
  constructor(private readonly page: Page) {}

  // ---- locators ----------------------------------------------------------

  private get addButton() {
    return this.page.getByTestId('vehicles-add-button');
  }

  private get dialog() {
    return this.page.getByRole('dialog');
  }

  private get companyIdInput() {
    return this.page.getByTestId('vehicle-form-company-id-input');
  }

  private get plateNumberInput() {
    return this.page.getByTestId('vehicle-form-plate-number-input');
  }

  private get typeInput() {
    return this.page.getByTestId('vehicle-form-type-input');
  }

  private get seatLayoutSelect() {
    return this.page.getByTestId('vehicle-form-seat-layout-id-select');
  }

  private get totalSeatsInput() {
    return this.page.getByTestId('vehicle-form-total-seats-input');
  }

  private get submitCreateButton() {
    return this.page.getByTestId('vehicle-form-submit');
  }

  private get confirmDeleteButton() {
    return this.page.getByTestId('vehicle-delete-confirm');
  }

  // ---- actions -----------------------------------------------------------

  async navigate(): Promise<void> {
    await this.page.goto(getOperatorAppUrl(URLS.ROUTES.OPERATOR_VEHICLES), {
      waitUntil: 'domcontentloaded',
      timeout: TimeoutValue.NAVIGATION,
    });
    await expect(this.page.getByRole('heading', { name: /^vehicles$/i })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  async openCreateDialog(): Promise<void> {
    await this.addButton.click();
    await expect(this.dialog).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  async fillCreate(input: VehicleCreateInput): Promise<void> {
    await this.companyIdInput.fill(String(input.companyId));
    await this.plateNumberInput.fill(input.plateNumber);
    await this.typeInput.fill(input.type);

    // Seat layout select — shadcn Select: click trigger then pick option by name fragment
    await this.seatLayoutSelect.click();
    await this.page
      .getByRole('option', { name: new RegExp(input.seatLayoutName, 'i') })
      .first()
      .click();

    await this.totalSeatsInput.fill(String(input.totalSeats));
  }

  async submitCreate(): Promise<void> {
    await this.submitCreateButton.click();
    await expect(this.dialog).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  /** Deletes the row whose plate number matches `plateNumber`. */
  async deleteRow(plateNumber: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(plateNumber, 'i') });
    await row.getByRole('button', { name: /^delete$/i }).click();
    await expect(this.page.getByRole('alertdialog')).toBeVisible({ timeout: TimeoutValue.ACTION });
    await this.confirmDeleteButton.click();
    await expect(this.page.getByRole('alertdialog')).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  // ---- assertions --------------------------------------------------------

  async expectRow(plateNumber: string): Promise<void> {
    await expect(this.page.getByRole('cell', { name: plateNumber, exact: false })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  async expectRowMissing(plateNumber: string): Promise<void> {
    await expect(this.page.getByRole('cell', { name: plateNumber, exact: false })).toBeHidden({
      timeout: TimeoutValue.ACTION,
    });
  }
}
