import { Then, When } from '@cucumber/cucumber';
import { SeatLayoutsPage } from '@page-objects/operator/seat-layouts.page';
import { OperatorShellPage } from '@page-objects/operator/operator-shell.page';
import { BrowserWorld } from '@support/world';
import { expect } from '@playwright/test';

When('I navigate to the seat layouts module', async function (this: BrowserWorld) {
  await new OperatorShellPage(this.page).gotoSeatLayouts();
});

Then('I should see the seat layouts page heading', async function (this: BrowserWorld) {
  await expect(this.page.getByRole('heading', { name: /seat layouts/i })).toBeVisible();
});

When('I open the add layout dialog', async function (this: BrowserWorld) {
  await new SeatLayoutsPage(this.page).openCreateDialog();
});

Then('the add seat layout dialog should be visible', async function (this: BrowserWorld) {
  await new SeatLayoutsPage(this.page).expectDialogVisible();
});

Then(
  'I should see the seeded layout {string} in the table',
  async function (this: BrowserWorld, layoutName: string) {
    await new SeatLayoutsPage(this.page).expectRow(layoutName);
  },
);
