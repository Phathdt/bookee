import { TimeoutValue } from '@config/test.config';
import { getOperatorAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

export interface RouteCreateInput {
  /** Numeric company / operator ID (seeded: 1=Phương Trang, 2=Thành Bưởi, 3=Sao Việt) */
  companyId: number;
  /** Visible station name fragment for the "From Station" select option */
  fromStationName: string;
  /** Visible station name fragment for the "To Station" select option */
  toStationName: string;
  distanceKm: number;
  durationMinutes: number;
}

/**
 * Operator CMS /routes page object.
 *
 * Usage:
 *   const routes = new RoutesPage(page);
 *   await routes.navigate();
 *   await routes.openCreateDialog();
 *   await routes.fillCreate({ companyId: 1, fromStationName: 'Miền Đông', toStationName: 'Miền Tây', distanceKm: 20, durationMinutes: 60 });
 *   await routes.submitCreate();
 */
export class RoutesPage {
  constructor(private readonly page: Page) {}

  // ---- locators ----------------------------------------------------------

  private get addButton() {
    return this.page.getByTestId('routes-add-button');
  }

  private get dialog() {
    return this.page.getByRole('dialog');
  }

  private get companyIdInput() {
    return this.page.getByTestId('route-form-company-id-input');
  }

  private get fromStationSelect() {
    return this.page.getByTestId('route-form-from-station-id-select');
  }

  private get toStationSelect() {
    return this.page.getByTestId('route-form-to-station-id-select');
  }

  private get distanceInput() {
    return this.page.getByTestId('route-form-distance-km-input');
  }

  private get durationInput() {
    return this.page.getByTestId('route-form-duration-minutes-input');
  }

  private get submitCreateButton() {
    return this.page.getByTestId('route-form-submit');
  }

  private get confirmDeleteButton() {
    return this.page.getByTestId('route-delete-confirm');
  }

  // ---- actions -----------------------------------------------------------

  async navigate(): Promise<void> {
    await this.page.goto(getOperatorAppUrl(URLS.ROUTES.OPERATOR_ROUTES), {
      waitUntil: 'domcontentloaded',
      timeout: TimeoutValue.NAVIGATION,
    });
    await expect(this.page.getByRole('heading', { name: /^routes$/i })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  async openCreateDialog(): Promise<void> {
    await this.addButton.click();
    await expect(this.dialog).toBeVisible({ timeout: TimeoutValue.ACTION });
  }

  async fillCreate(input: RouteCreateInput): Promise<void> {
    // Company ID — plain number input (disabled for non-admin)
    await this.companyIdInput.fill(String(input.companyId));

    // From Station select — shadcn Select: click trigger, then pick option by text
    await this.fromStationSelect.click();
    await this.page
      .getByRole('option', { name: new RegExp(input.fromStationName, 'i') })
      .first()
      .click();

    // To Station select
    await this.toStationSelect.click();
    await this.page
      .getByRole('option', { name: new RegExp(input.toStationName, 'i') })
      .first()
      .click();

    await this.distanceInput.fill(String(input.distanceKm));
    await this.durationInput.fill(String(input.durationMinutes));
  }

  async submitCreate(): Promise<void> {
    await this.submitCreateButton.click();
    await expect(this.dialog).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  /** Deletes the first route row whose text matches `identifier` (e.g. route ID). */
  async deleteRow(identifier: string): Promise<void> {
    const row = this.page.getByRole('row', { name: new RegExp(identifier, 'i') });
    await row.getByRole('button', { name: /^delete$/i }).click();
    await expect(this.page.getByRole('alertdialog')).toBeVisible({ timeout: TimeoutValue.ACTION });
    await this.confirmDeleteButton.click();
    await expect(this.page.getByRole('alertdialog')).toBeHidden({ timeout: TimeoutValue.ACTION });
  }

  // ---- assertions --------------------------------------------------------

  /** Asserts the table contains a row with `#id` cell text. */
  async expectRowById(id: string): Promise<void> {
    await expect(this.page.getByRole('cell', { name: `#${id}`, exact: true })).toBeVisible({
      timeout: TimeoutValue.ACTION,
    });
  }

  async expectRowByIdMissing(id: string): Promise<void> {
    await expect(this.page.getByRole('cell', { name: `#${id}`, exact: true })).toBeHidden({
      timeout: TimeoutValue.ACTION,
    });
  }
}
