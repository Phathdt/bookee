import { TimeoutValue } from '@config/test.config';
import { setDefaultTimeout, setWorldConstructor, World } from '@cucumber/cucumber';
import type { Browser, BrowserContext, Page } from '@playwright/test';

setDefaultTimeout(TimeoutValue.TEST_WORKFLOW);

export class BrowserWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  data: Record<string, unknown> = {};
}

setWorldConstructor(BrowserWorld);
