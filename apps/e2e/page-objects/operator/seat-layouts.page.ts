import { TimeoutValue } from '@config/test.config';
import { getOperatorAppUrl, URLS } from '@config/urls.config';
import { expect, Page } from '@playwright/test';

/**
 * Operator CMS /seat-layouts page object.
 *
 * Full seat-grid creation is deferred (complex JSON editor).
 * v1 tests only verify: navigate, dialog opens, seeded rows visible.
 *
 * Usage:
 *   const layouts = new SeatLayoutsPage(page);
 *   await layouts.navigate();
 *   await layouts.openCreateDialog();
 *   await layouts.expectRow('Giường nằm 34 chỗ');
 */
export class SeatLayoutsPage {
  constructor(private readonly page: Page) {}

  // ---- locators ----------------------------------------------------------

  private get addButton() {
    return this.page.getByRole('button', { name: /add layout/i });
  }

  private get dialog() {
    return this.page.getByRole('dialog');
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

  async closeDialog(): Promise<void> {
    await this.dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(this.dialog).toBeHidden({ timeout: TimeoutValue.ACTION });
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
