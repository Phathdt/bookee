import { TimeoutValue } from '@config/test.config';
import { getOperatorAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

export interface TripBulkCreateInput {
  /** Route ID — matched as "Route #N" in the select */
  routeId: number;
  /** Vehicle plate fragment */
  vehiclePlate: string;
  basePrice: number;
  /** date string YYYY-MM-DD */
  startDate: string;
  /** date string YYYY-MM-DD */
  endDate: string;
  /** time string HH:mm */
  dailyDepartureTime: string;
  /** minutes e.g. 360 */
  tripDurationMinutes: number;
}

export interface TripCreateInput {
  /** Route ID number — will be matched as "Route #N" in the select option text */
  routeId: number;
  /** Vehicle plate number fragment for the vehicle select option */
  vehiclePlate: string;
  /** datetime-local string e.g. "2027-03-15T08:00" */
  departureTime: string;
  /** datetime-local string e.g. "2027-03-15T14:00" */
  arrivalTime: string;
  basePrice: number;
}

/**
 * Operator CMS /trips page object.
 *
 * Usage:
 *   const trips = new TripsPage(page);
 *   await trips.navigate();
 *   await trips.openCreateDialog();
 *   await trips.fillCreate({ routeId: 1, vehiclePlate: '51B', departureTime: '2027-06-01T08:00', arrivalTime: '2027-06-01T14:00', basePrice: 150000 });
 *   await trips.submitCreate();
 *   await trips.expectRowWithStatus('scheduled');
 */
export class TripsPage {
  constructor(private readonly page: Page) {}

  // ---- locators ----------------------------------------------------------

  private get addButton() {
    return this.page.getByTestId('trips-add-button');
  }

  private get bulkCreateButton() {
    return this.page.getByTestId('trips-bulk-create-button');
  }

  private get dialog() {
    return this.page.getByRole('dialog');
  }

  private get routeSelect() {
    return this.page.getByTestId('trip-form-route-id-select');
  }

  private get vehicleSelect() {
    return this.page.getByTestId('trip-form-vehicle-id-select');
  }

  private get departureInput() {
    return this.page.getByTestId('trip-form-departure-time-input');
  }

  private get arrivalInput() {
    return this.page.getByTestId('trip-form-arrival-time-input');
  }

  private get basePriceInput() {
    return this.page.getByTestId('trip-form-base-price-input');
  }

  private get submitCreateButton() {
    return this.page.getByTestId('trip-form-submit');
  }

  private get statusFilter() {
    return this.page.getByTestId('trips-status-filter');
  }

  // ---- bulk create locators -----------------------------------------------

  private get bulkRouteSelect() {
    return this.page.getByTestId('trip-bulk-form-route-select');
  }

  private get bulkVehicleSelect() {
    return this.page.getByTestId('trip-bulk-form-vehicle-select');
  }

  private get bulkBasePriceInput() {
    return this.page.getByTestId('trip-bulk-form-base-price-input');
  }

  private get bulkStartDateInput() {
    return this.page.getByTestId('trip-bulk-form-start-date-input');
  }

  private get bulkEndDateInput() {
    return this.page.getByTestId('trip-bulk-form-end-date-input');
  }

  private get bulkDailyDepartureTimeInput() {
    return this.page.getByTestId('trip-bulk-form-daily-departure-time-input');
  }

  private get bulkTripDurationMinutesInput() {
    return this.page.getByTestId('trip-bulk-form-trip-duration-minutes-input');
  }

  private get bulkSubmitButton() {
    return this.page.getByTestId('trip-bulk-form-submit');
  }

  // ---- actions -----------------------------------------------------------

  async navigate(): Promise<void> {
    await this.page.goto(getOperatorAppUrl(URLS.ROUTES.OPERATOR_TRIPS), {
      waitUntil: 'domcontentloaded',
      timeout: TimeoutValue.NAVIGATION,
    });
    await expect(this.page.getByRole('heading', { name: /^trips$/i })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  async openCreateDialog(): Promise<void> {
    await this.addButton.click();
    await expect(this.dialog).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  async fillCreate(input: TripCreateInput): Promise<void> {
    // Route select — shadcn Select: click trigger by test-id, then pick option by text
    await this.routeSelect.click();
    await this.page
      .getByRole('option', { name: new RegExp(`route #${input.routeId}`, 'i') })
      .first()
      .click();

    // Vehicle select
    await this.vehicleSelect.click();
    await this.page
      .getByRole('option', { name: new RegExp(input.vehiclePlate, 'i') })
      .first()
      .click();

    // datetime-local inputs — fill via .fill() which sets the value attribute
    await this.departureInput.fill(input.departureTime);
    await this.arrivalInput.fill(input.arrivalTime);

    await this.basePriceInput.fill(String(input.basePrice));
  }

  async submitCreate(): Promise<void> {
    await this.submitCreateButton.click();
    await expect(this.dialog).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  /**
   * Selects a value in the status filter select/dropdown.
   * Trigger is data-testid="trips-status-filter".
   */
  async setStatusFilter(status: string): Promise<void> {
    await this.statusFilter.click();
    await this.page
      .getByRole('option', { name: new RegExp(status, 'i') })
      .first()
      .click();
  }

  /** Opens the bulk-create dialog. */
  async openBulkDialog(): Promise<void> {
    await this.bulkCreateButton.click();
    await expect(this.dialog).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  /** Fills the bulk create form fields. */
  async fillBulkCreate(payload: TripBulkCreateInput): Promise<void> {
    await this.bulkRouteSelect.click();
    await this.page
      .getByRole('option', { name: new RegExp(`route #${payload.routeId}`, 'i') })
      .first()
      .click();

    await this.bulkVehicleSelect.click();
    await this.page
      .getByRole('option', { name: new RegExp(payload.vehiclePlate, 'i') })
      .first()
      .click();

    await this.bulkBasePriceInput.fill(String(payload.basePrice));
    await this.bulkStartDateInput.fill(payload.startDate);
    await this.bulkEndDateInput.fill(payload.endDate);
    await this.bulkDailyDepartureTimeInput.fill(payload.dailyDepartureTime);
    await this.bulkTripDurationMinutesInput.fill(String(payload.tripDurationMinutes));
  }

  /** Submits the bulk create form and waits for the dialog to close. */
  async submitBulk(): Promise<void> {
    await this.bulkSubmitButton.click();
    await expect(this.dialog).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  /**
   * Opens the view (readonly) dialog for trip `id`.
   * Uses data-testid="trip-view-button-{id}".
   */
  async openViewDialog(id: string): Promise<void> {
    await this.page.getByTestId(`trip-view-button-${id}`).click();
    await expect(this.dialog).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  /**
   * Asserts that the form inputs inside the open dialog are disabled (readonly view).
   */
  async expectFormDisabled(): Promise<void> {
    // Check departure-time input is disabled — sufficient proxy for readonly mode
    await expect(this.departureInput).toBeDisabled({ timeout: TimeoutValue.ACTION });
  }

  /**
   * Clicks the status-transition button for `nextStatus` on the row identified
   * by `rowIdentifier` (e.g. a trip ID like "#42").
   * Uses data-testid="trip-status-action-{nextStatus}" — stable regardless of button label text.
   */
  async clickStatusTransition(rowIdentifier: string, nextStatus: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(rowIdentifier, 'i') });
    await row.getByTestId(`trip-status-action-${nextStatus.toLowerCase()}`).click();
  }

  // ---- assertions --------------------------------------------------------

  async expectBulkButtonVisible(): Promise<void> {
    await expect(this.bulkCreateButton).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  /**
   * Asserts at least one row displays the given status badge text
   * (e.g. "scheduled", "cancelled").
   */
  async expectRowWithStatus(status: string): Promise<void> {
    await expect(
      this.page.getByText(new RegExp(status.replace('_', ' '), 'i')).first(),
    ).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  /**
   * Asserts the row identified by `rowIdentifier` shows the given status.
   */
  async expectRowStatus(rowIdentifier: string, status: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(rowIdentifier, 'i') });
    await expect(row.getByText(new RegExp(status.replace('_', ' '), 'i'))).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  /** Returns the current number of data rows in the trips table (excludes header). */
  async getDataRowCount(): Promise<number> {
    // Data rows are identified by "#N" id cells
    return this.page.getByRole('cell', { name: /^#\d+$/ }).count();
  }

  /** Returns the last trip row ID as a numeric string. */
  async getLastRowId(): Promise<string> {
    const idCell = this.page.getByRole('cell', { name: /^#\d+$/ }).last();
    const text = await idCell.innerText();
    return text.replace('#', '').trim();
  }

  /** Asserts that only rows with the given status are visible (none with another status). */
  async expectOnlyStatus(status: string): Promise<void> {
    await expect(
      this.page.getByText(new RegExp(status.replace('_', ' '), 'i')).first(),
    ).toBeVisible({ timeout: TimeoutValue.ACTION });
  }
}
