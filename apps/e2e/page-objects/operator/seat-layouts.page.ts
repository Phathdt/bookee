import { TimeoutValue } from '@config/test.config';
import { getOperatorAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

export interface SeatLayoutCreateInput {
  name: string;
  rows: number;
  cols: number;
  /** Minimal JSON for the seats field, e.g. '[]' or '[{"row":1,"col":1,"label":"A1"}]' */
  seatsJson: string;
}

/**
 * Operator CMS /seat-layouts page object.
 *
 * Usage:
 *   const layouts = new SeatLayoutsPage(page);
 *   await layouts.navigate();
 *   await layouts.openCreateDialog();
 *   await layouts.fillCreate({ name: 'Test', rows: 2, cols: 2, seatsJson: '[]' });
 *   await layouts.submitCreate();
 *   await layouts.expectRow('Test');
 */
export class SeatLayoutsPage {
  constructor(private readonly page: Page) {}

  // ---- locators ----------------------------------------------------------

  private get addButton() {
    return this.page.getByTestId('seat-layouts-add-button');
  }

  private get dialog() {
    return this.page.getByRole('dialog');
  }

  private get cancelButton() {
    return this.page.getByTestId('seat-layout-form-cancel');
  }

  private get nameInput() {
    return this.page.getByTestId('seat-layout-form-name-input');
  }

  private get rowsInput() {
    return this.page.getByTestId('seat-layout-form-rows-input');
  }

  private get colsInput() {
    return this.page.getByTestId('seat-layout-form-cols-input');
  }

  private get seatsJsonTextarea() {
    return this.page.getByTestId('seat-layout-form-seats-json-textarea');
  }

  private get submitButton() {
    return this.page.getByTestId('seat-layout-form-submit');
  }

  private get confirmDeleteButton() {
    return this.page.getByTestId('seat-layout-delete-confirm');
  }

  // ---- actions -----------------------------------------------------------

  async navigate(): Promise<void> {
    await this.page.goto(getOperatorAppUrl(URLS.ROUTES.OPERATOR_SEAT_LAYOUTS), {
      waitUntil: 'domcontentloaded',
      timeout: TimeoutValue.NAVIGATION,
    });
    await expect(this.page.getByRole('heading', { name: /seat layouts/i })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  async openCreateDialog(): Promise<void> {
    await this.addButton.click();
    await expect(this.dialog).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  async fillCreate(input: SeatLayoutCreateInput): Promise<void> {
    await this.nameInput.fill(input.name);
    await this.rowsInput.fill(String(input.rows));
    await this.colsInput.fill(String(input.cols));
    await this.seatsJsonTextarea.fill(input.seatsJson);
  }

  async submitCreate(): Promise<void> {
    await this.submitButton.click();
    await expect(this.dialog).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  async closeDialog(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.dialog).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  /** Deletes the row whose name matches `name` via data-testid pattern. */
  async deleteRow(name: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(name, 'i') });
    await row.getByRole('button', { name: /^delete$/i }).click();
    await expect(this.page.getByRole('alertdialog')).toBeVisible({ timeout: TimeoutValue.ACTION });
    await this.confirmDeleteButton.click();
    await expect(this.page.getByRole('alertdialog')).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  /** Confirms a pending delete dialog. */
  async confirmDelete(): Promise<void> {
    await this.confirmDeleteButton.click();
    await expect(this.page.getByRole('alertdialog')).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  // ---- assertions --------------------------------------------------------

  async expectDialogVisible(): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: TimeoutValue.ACTION });
    await expect(this.dialog.getByRole('heading', { name: /add seat layout/i })).toBeVisible();
  }

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
}
