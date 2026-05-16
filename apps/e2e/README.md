# @bookee/e2e

End-to-end tests for the Bookee user-facing FE — Cucumber + Playwright.

## Stack

- `@cucumber/cucumber` v12 — BDD runner, parallel scenarios
- `@playwright/test` v1.59 — browser automation
- `ts-node` + `tsconfig-paths` — TS feature file execution
- `pino` — structured test logs

## Layout

```
apps/e2e/
├── .cucumber.cjs                  # runner config (parallel, ts-node hook)
├── .env / .env.example            # env vars (APP_URL, HEADLESS, TRACE)
├── config/
│   ├── test.config.ts             # presets (local/ci), timeouts, browser
│   └── urls.config.ts             # APP/API URLs + routes
├── page-objects/                  # Page Object pattern — *.page.ts
├── utils/
│   ├── browser-factory.ts         # createBrowserContextPage / close
│   └── logger.ts                  # pino logger
└── tests/
    ├── features/<feat>/*.feature  # Gherkin scenarios
    ├── features/<feat>/*.steps.ts # step definitions (colocated)
    └── support/
        ├── world.ts               # BrowserWorld
        └── browser-hooks.ts       # Before/After scenarios
```

## Prerequisites

1. Backend running:
   ```bash
   bun run db:up
   cd apps/backend && bun run dev
   ```
2. user-web running:
   ```bash
   cd apps/user-web && bun run dev
   ```
3. Browsers installed:
   ```bash
   bun run --filter @bookee/e2e install:browsers
   ```

## Run

```bash
bun run --filter @bookee/e2e test           # parallel, headless
bun run --filter @bookee/e2e test:headed    # see the browser
bun run --filter @bookee/e2e test:smoke     # @smoke tag only
bun run --filter @bookee/e2e test:auth      # @auth tag only
```

Run a single feature file:

```bash
cd apps/e2e
bunx cucumber-js --config .cucumber.cjs tests/features/auth/login.feature
```

## Tracing

`TRACE=retain-on-failure` (default): a `.zip` Playwright trace is saved to
`test-results/traces/` for every failed scenario. Open it with:

```bash
bunx playwright show-trace test-results/traces/<file>.zip
```

## Conventions

- One `.feature` + `.steps.ts` pair per scenario group.
- Shared / cross-feature steps belong to the file that introduces them — keep
  steps DRY but don't extract a generic "common.steps.ts" until duplication
  becomes painful.
- Tag scenarios: `@smoke`, `@auth`, `@priority_high|medium|low`.
- Data should be hermetic per scenario (faker emails / phones) when possible.
  Shared seeded fixtures (admin@bookee.local) are used only when scenarios
  need to assert against a known duplicate.
