import { TimeoutValue } from '@config/test.config';
import { getOperatorAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

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
}
