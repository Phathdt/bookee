import { After, Before } from '@cucumber/cucumber';
import { closeBrowserResources, createBrowserContextPage } from '@utils/browser-factory';
import { logger } from '@utils/logger';

import { BrowserWorld } from './world';

Before(async function (this: BrowserWorld) {
  const bundle = await createBrowserContextPage();
  this.browser = bundle.browser;
  this.context = bundle.context;
  this.page = bundle.page;
  this.data = {};
  logger.info('Browser initialized');
});

After(async function (this: BrowserWorld, scenario) {
  const testPassed = scenario.result?.status === 'PASSED';
  try {
    await closeBrowserResources({
      browser: this.browser,
      context: this.context,
      page: this.page,
      testPassed,
      scenarioName: scenario.pickle.name,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error during browser cleanup');
  }
});
