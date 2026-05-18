import { TimeoutValue } from '@config/test.config';
import { getOperatorAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

export interface StationCreateInput {
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
}

export interface StationEditInput {
  name?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

/**
 * Operator CMS /stations page object.
 *
 * Usage:
 *   const stations = new StationsPage(page);
 *   await stations.navigate();
 *   await stations.openCreateDialog();
 *   await stations.fillCreate({ name, address, city, lat, lng });
 *   await stations.submitCreate();
 *   await stations.expectRow(name);
 */
export class StationsPage {
  constructor(private readonly page: Page) {}

  // ---- locators ----------------------------------------------------------

  private get addButton() {
    return this.page.getByTestId('stations-add-button');
  }

  private get dialog() {
    return this.page.getByRole('dialog');
  }

  private get nameInput() {
    return this.page.getByTestId('station-form-name-input');
  }

  private get addressInput() {
    return this.page.getByTestId('station-form-address-input');
  }

  private get cityInput() {
    return this.page.getByTestId('station-form-city-input');
  }

  private get latInput() {
    return this.page.getByTestId('station-form-lat-input');
  }

  private get lngInput() {
    return this.page.getByTestId('station-form-lng-input');
  }

  private get submitCreateButton() {
    return this.page.getByTestId('station-form-submit');
  }

  private get confirmDeleteButton() {
    return this.page.getByTestId('station-delete-confirm');
  }

  private get searchInput() {
    return this.page.getByTestId('stations-search-input');
  }

  // ---- actions -----------------------------------------------------------

  async navigate(): Promise<void> {
    await this.page.goto(getOperatorAppUrl(URLS.ROUTES.OPERATOR_STATIONS), {
      waitUntil: 'domcontentloaded',
      timeout: TimeoutValue.NAVIGATION,
    });
    await expect(this.page.getByRole('heading', { name: /^stations$/i })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  async openCreateDialog(): Promise<void> {
    await this.addButton.click();
    await expect(this.dialog).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  async fillCreate(input: StationCreateInput): Promise<void> {
    await this.nameInput.fill(input.name);
    await this.addressInput.fill(input.address);
    await this.cityInput.fill(input.city);
    // Clear default "0" then fill numeric value
    await this.latInput.fill(String(input.lat));
    await this.lngInput.fill(String(input.lng));
  }

  async submitCreate(): Promise<void> {
    await this.submitCreateButton.click();
    // Dialog should close on success
    await expect(this.dialog).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  /**
   * Clicks submit without waiting for the dialog to close.
   * Use when testing validation errors — dialog should remain open.
   */
  async submitCreateExpectError(): Promise<void> {
    await this.submitCreateButton.click();
  }

  /**
   * Opens the edit dialog for the row identified by `id` (data-testid="station-edit-button-{id}"),
   * fills any provided fields, and submits.
   */
  async editRow(id: string, fields: StationEditInput): Promise<void> {
    await this.page.getByTestId(`station-edit-button-${id}`).click();
    await expect(this.dialog).toBeVisible({ timeout: TimeoutValue.ACTION });
    if (fields.name !== undefined) await this.nameInput.fill(fields.name);
    if (fields.address !== undefined) await this.addressInput.fill(fields.address);
    if (fields.city !== undefined) await this.cityInput.fill(fields.city);
    if (fields.lat !== undefined) await this.latInput.fill(String(fields.lat));
    if (fields.lng !== undefined) await this.lngInput.fill(String(fields.lng));
    await this.submitCreateButton.click();
    await expect(this.dialog).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  /** Types into the search box, filtering the stations table. */
  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
  }

  /** Clicks the Delete button on the row matching `name`, then confirms. */
  async deleteRow(name: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(name, 'i') });
    await row.getByRole('button', { name: /^delete$/i }).click();
    await expect(this.page.getByRole('alertdialog')).toBeVisible({ timeout: TimeoutValue.ACTION });
    await this.confirmDeleteButton.click();
    await expect(this.page.getByRole('alertdialog')).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  // ---- assertions --------------------------------------------------------

  async expectRow(name: string): Promise<void> {
    await expect(this.page.getByRole('cell', { name, exact: false })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  async expectRowMissing(name: string): Promise<void> {
    await expect(this.page.getByRole('cell', { name, exact: false })).toBeHidden({
      timeout: TimeoutValue.ACTION,
    });
  }

  /** Returns the numeric ID from the row containing `name`, via the row's data-testid. */
  async getRowId(name: string): Promise<string> {
    const row = this.page.getByRole('row', { name: new RegExp(name, 'i') });
    // The row cell with "#N" pattern holds the ID
    const idCell = row.getByRole('cell', { name: /^#\d+$/ });
    const text = await idCell.innerText();
    return text.replace('#', '').trim();
  }

  /** Asserts the table row with `name` is currently visible. */
  async expectRowVisible(name: string): Promise<void> {
    await expect(this.page.getByRole('cell', { name, exact: false })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  /** Asserts the table row with `name` is not visible (filtered out). */
  async expectRowHidden(name: string): Promise<void> {
    await expect(this.page.getByRole('cell', { name, exact: false })).toBeHidden({
      timeout: TimeoutValue.ACTION,
    });
  }

  /**
   * Asserts a form-level validation error is shown inside the open dialog.
   * Matches any visible error text (shadcn FormMessage pattern).
   */
  async expectFormError(): Promise<void> {
    await expect(
      this.page
        .getByRole('dialog')
        .locator('[class*="text-destructive"], [aria-live="polite"]')
        .first(),
    ).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  async expectErrorMessage(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: false })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }
}
