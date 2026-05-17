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
    return this.page.getByRole('button', { name: /^add trip$/i });
  }

  private get bulkCreateButton() {
    return this.page.getByRole('button', { name: /bulk create/i });
  }

  private get dialog() {
    return this.page.getByRole('dialog');
  }

  private get departureInput() {
    return this.dialog.getByLabel(/departure/i);
  }

  private get arrivalInput() {
    return this.dialog.getByLabel(/arrival/i);
  }

  private get basePriceInput() {
    return this.dialog.getByLabel(/base price/i);
  }

  private get submitCreateButton() {
    return this.dialog.getByRole('button', { name: /create trip/i });
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
    // Route select — combobox index 0
    const routeTrigger = this.dialog.getByRole('combobox').nth(0);
    await routeTrigger.click();
    await this.page
      .getByRole('option', { name: new RegExp(`route #${input.routeId}`, 'i') })
      .first()
      .click();

    // Vehicle select — combobox index 1
    const vehicleTrigger = this.dialog.getByRole('combobox').nth(1);
    await vehicleTrigger.click();
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
   * Clicks the status-transition button labelled `label` on the row that
   * contains `rowIdentifier` text (e.g. a trip ID like "#42").
   */
  async clickStatusTransition(rowIdentifier: string, label: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(rowIdentifier, 'i') });
    await row.getByRole('button', { name: new RegExp(label, 'i') }).click();
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
