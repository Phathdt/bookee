# @bookee/e2e

End-to-end tests for the Bookee platform — Cucumber + Playwright.
Covers both the **user-web** (port 5174) and the **operator-CMS** (port 5173).

## Stack

- `@cucumber/cucumber` v12 — BDD runner, parallel scenarios
- `@playwright/test` v1.59 — browser automation
- `ts-node` + `tsconfig-paths` — TS feature file execution
- `pino` — structured test logs
- `@faker-js/faker` — hermetic per-scenario test data

## Layout

```
apps/e2e/
├── .cucumber.cjs                        # runner config (parallel, ts-node hook)
├── .env / .env.example                  # env vars (APP_USER_URL, APP_OPERATOR_URL, …)
├── config/
│   ├── test.config.ts                   # presets (local/ci), timeouts, browser
│   └── urls.config.ts                   # multi-app URLs + route constants
├── page-objects/
│   ├── landing.page.ts                  # user-web AuthDemo + profile + health
│   └── operator/
│       ├── operator-login.page.ts       # /login
│       ├── operator-shell.page.ts       # sidebar nav + topbar (sign-out, nav-active)
│       ├── dashboard.page.ts            # / dashboard cards
│       ├── stations.page.ts             # /stations CRUD + search + edit
│       ├── routes.page.ts               # /routes CRUD + edit
│       ├── seat-layouts.page.ts         # /seat-layouts CRUD
│       ├── vehicles.page.ts             # /vehicles CRUD + edit
│       └── trips.page.ts               # /trips CRUD + bulk-create + view + status transitions
├── utils/
│   ├── browser-factory.ts               # createBrowserContextPage / close
│   └── logger.ts                        # pino logger
└── tests/
    ├── features/
    │   ├── auth/                        # user-web: register, login, profile, health
    │   └── operator/                    # operator-CMS scenarios
    │       ├── operator-shared.steps.ts # shared "I am logged in as operator admin"
    │       ├── login.{feature,steps.ts}
    │       ├── dashboard.{feature,steps.ts}
    │       ├── shell.{feature,steps.ts}
    │       ├── stations-crud.{feature,steps.ts}
    │       ├── routes-crud.{feature,steps.ts}
    │       ├── seat-layouts-crud.{feature,steps.ts}
    │       ├── vehicles-crud.{feature,steps.ts}
    │       └── trips-crud.{feature,steps.ts}
    └── support/
        ├── world.ts                     # BrowserWorld
        └── browser-hooks.ts            # Before/After scenarios
```

## Required services

All services must be running **before** executing e2e tests.

```bash
# 1. Database + Redis
bun run db:up

# 2. Backend API (port 3000)
bun run --filter @bookee/backend start:dev

# 3. user-web (port 5174)
bun run --filter @bookee/user-web dev

# 4. operator-CMS (port 5173)
bun run --filter @bookee/operator-cms dev
```

## Seed data

Seed the database once after `db:up`:

```bash
bun run --filter @bookee/backend db:seed
```

This creates:

| Resource     | Details                                                                                |
| ------------ | -------------------------------------------------------------------------------------- |
| Admin user   | phone `0900000000`, password `admin`, email `admin@bookee.local`                       |
| Stations     | Bến xe Miền Đông Mới, Bến xe Miền Tây, Bến xe Đà Lạt, Bến xe Cần Thơ, Bến xe Nha Trang |
| Seat layouts | Giường nằm 34 chỗ, Limousine 22 chỗ                                                    |
| Operators    | Phương Trang (id=1), Thành Bưởi (id=2), Sao Việt (id=3)                                |
| Routes       | 6 seeded routes                                                                        |
| Vehicles     | 6 seeded vehicles                                                                      |

## Run

```bash
# All tests (parallel, headless)
bun run --filter @bookee/e2e e2e:all

# Smoke only (@smoke)
bun run --filter @bookee/e2e e2e:smoke

# All user-web scenarios (@auth + @health)
bun run --filter @bookee/e2e e2e:user

# Auth scenarios only (@auth) — subset of e2e:user
bun run --filter @bookee/e2e e2e:auth

# All operator-CMS scenarios
bun run --filter @bookee/e2e e2e:operator

# See the browser (headed mode)
bun run --filter @bookee/e2e e2e:headed
```

Run a single feature file:

```bash
cd apps/e2e
bunx cucumber-js --config .cucumber.cjs tests/features/operator/login.feature
```

## Tags

| Tag                      | Scope                                                         |
| ------------------------ | ------------------------------------------------------------- |
| `@smoke`                 | Critical happy-paths (login for both apps)                    |
| `@auth`                  | user-web: register + login (parent tag)                       |
| `@auth-register`         | Registration scenarios                                        |
| `@auth-login`            | Login scenarios including empty-identifier validation         |
| `@auth-profile`          | Profile rename + sign-out                                     |
| `@health`                | Landing page health card refresh                              |
| `@operator-auth`         | Operator CMS login scenarios                                  |
| `@operator-dashboard`    | Dashboard cards + navigation                                  |
| `@operator-shell`        | Topbar sign-out + sidebar nav active state                    |
| `@operator-stations`     | Stations CRUD + search + edit + validation                    |
| `@operator-routes`       | Routes CRUD + edit + same-station validation                  |
| `@operator-seat-layouts` | Seat layouts CRUD (create with JSON, delete)                  |
| `@operator-vehicles`     | Vehicles CRUD + edit                                          |
| `@operator-trips`        | Trips CRUD + bulk-create + view readonly + status transitions |

## Tracing

`TRACE=retain-on-failure` (default): a `.zip` Playwright trace is saved to
`test-results/traces/` for every failed scenario. Open it with:

```bash
bunx playwright show-trace test-results/traces/<file>.zip
```

## Conventions

- One `.feature` + `.steps.ts` pair per scenario group.
- Shared step `Given I am logged in as operator admin` lives in
  `tests/features/operator/operator-shared.steps.ts` and is reused by all
  operator features via the Background block.
- Each scenario creates its own data with faker-prefixed identifiers
  (`E2E <random>`). Cleanup happens within the same scenario so seeded data
  stays pristine.
- Prefer role-based locators (`getByRole`, `getByLabel`) over CSS selectors.
- Use `TimeoutValue.ACTION` for element waits; `TimeoutValue.NAVIGATION` for
  `page.goto` / `waitForURL`.
