import fs from 'node:fs';
import path from 'node:path';

import preset, { BrowserType, TraceMode } from '@config/test.config';
import { Browser, BrowserContext, chromium, firefox, Page, webkit } from '@playwright/test';

export interface BrowserBundle {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

function pickBrowser(): typeof chromium {
  switch (preset.browser) {
    case BrowserType.FIREFOX:
      return firefox as unknown as typeof chromium;
    case BrowserType.WEBKIT:
      return webkit as unknown as typeof chromium;
    default:
      return chromium;
  }
}

export async function createBrowserContextPage(): Promise<BrowserBundle> {
  const headless =
    process.env.HEADLESS !== undefined ? process.env.HEADLESS !== 'false' : preset.headless;

  const browser = await pickBrowser().launch({ headless });
  const context = await browser.newContext({
    viewport: { width: preset.viewportWidth, height: preset.viewportHeight },
    ignoreHTTPSErrors: true,
  });

  if (preset.trace === TraceMode.ON || preset.trace === TraceMode.RETAIN_ON_FAILURE) {
    await context.tracing.start({ screenshots: true, snapshots: true });
  }

  const page = await context.newPage();
  return { browser, context, page };
}

export async function closeBrowserResources(
  resources: Partial<BrowserBundle> & { testPassed?: boolean; scenarioName?: string },
): Promise<void> {
  if (resources.context) {
    const shouldSave =
      preset.trace === TraceMode.ON ||
      (preset.trace === TraceMode.RETAIN_ON_FAILURE && !resources.testPassed);

    if (shouldSave) {
      try {
        const tracesDir = path.resolve(__dirname, '..', 'test-results', 'traces');
        if (!fs.existsSync(tracesDir)) fs.mkdirSync(tracesDir, { recursive: true });
        const safe = (resources.scenarioName ?? 'trace').replace(/\W+/g, '_');
        await resources.context.tracing.stop({
          path: path.join(tracesDir, `${safe}-${Date.now()}.zip`),
        });
      } catch {
        /* tracing may not have been started */
      }
    } else {
      try {
        await resources.context.tracing.stop();
      } catch {
        /* ignore */
      }
    }
  }

  if (resources.page) await resources.page.close().catch(() => undefined);
  if (resources.context) await resources.context.close().catch(() => undefined);
  if (resources.browser) await resources.browser.close().catch(() => undefined);
}
