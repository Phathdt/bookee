# Bookee

Multi-operator intercity trip booking platform — Turborepo monorepo.

## Stack

- **Runtime + package manager**: [Bun](https://bun.sh) 1.3+
- **Monorepo orchestrator**: [Turborepo](https://turbo.build)
- **Backend**: NestJS (SWC builder) + Prisma + PostgreSQL
- **Frontend**: React + Vite + React Router v6 + TanStack Query v5
- **Lang**: TypeScript (strict)

## Prerequisites

- Bun ≥ 1.3 (`curl -fsSL https://bun.sh/install | bash`)
- Node not required at runtime, but useful for some tooling

## Quick start

```bash
bun install            # install all workspace deps
cp .env.example .env   # set DATABASE_URL, REDIS_URL, etc.
bun run db:up          # start postgres + redis via docker compose
bun run dev            # start backend (:3000), operator-cms (:5173), user-web (:5174) in parallel
```

### Common scripts

```bash
bun run build          # build all apps + packages
bun run typecheck      # tsc --noEmit across workspace
bun run lint           # oxlint across workspace
bun run test           # run vitest across workspace
bun run format         # oxfmt write
bun run codegen        # regenerate api-client from openapi.yaml
```

### Docker (local infra)

```bash
bun run db:up          # docker compose up -d (postgres :5432, redis :6379)
bun run db:down        # stop containers
bun run db:logs        # tail logs
bun run db:reset       # drop volumes + restart (clean slate)
```

Postgres data lives in named volume `bookee_postgres-data` (survives `db:down`).
`db:reset` wipes it.

## Workspace layout

```
bookee/
├── apps/
│   ├── backend/             # NestJS backend (port 3000)
│   ├── operator-cms/        # React+Vite admin portal (port 5173)
│   └── user-web/            # React+Vite customer site (port 5174)
├── packages/
│   ├── config/              # tsconfig presets (oxlint + oxfmt configured at root)
│   └── api-client/          # openapi.yaml + generated React Query hooks + Zod schemas
├── turbo.json               # pipeline definition
└── package.json             # root, workspaces + scripts
```

### Workspace dependencies

```
apps/backend      → packages/config
apps/operator-cms → packages/api-client, packages/config
apps/user-web     → packages/api-client, packages/config
```

## NestJS on Bun + SWC

- Dev: `nest start --builder swc --watch` (run via Node by nest CLI).
- Build: `nest build --builder swc` emits CommonJS to `dist/`.
- Prod: `bun dist/main.js` (Bun runs compiled JS).
- `.swcrc` keeps `legacyDecorator + decoratorMetadata` for NestJS DI.
- If you hit native module issues (`bcrypt`, etc.), prefer pure-JS alternatives (`bcryptjs`).

## Common gotchas

- After cloning, run `bun install` once at root — workspace symlinks won't exist otherwise.
- Adding a new package: create `packages/<name>/package.json` with `name: "@bookee/<name>"`, then re-run `bun install` at root.
- Lefthook hooks install on `bun install` via `"prepare": "lefthook install"`.

## API client codegen

End-to-end type safety: NestJS spec → openapi.yaml → React Query hooks + Zod schemas.

```bash
# After changing a controller or DTO in apps/backend:
bun run openapi:export   # dumps packages/api-client/openapi.yaml
bun run codegen          # orval regenerates packages/api-client/src/generated/**
```

FE apps import from `@bookee/api-client`:

```tsx
import { useGetHealth } from '@bookee/api-client';
import { getHealthResponse } from '@bookee/api-client/zod';
```

See [`packages/api-client/README.md`](packages/api-client/README.md) for DTO/operationId conventions.

## Subdirectory docs

- `apps/backend/README.md` — backend specifics
- `apps/operator-cms/README.md`, `apps/user-web/README.md` — FE specifics
- `packages/api-client/README.md` — codegen workflow + backend conventions
- `openspec/` — change proposals and specs
