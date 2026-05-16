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
bun run dev            # start backend (:3000), operator-cms (:5173), user-web (:5174) in parallel
bun run build          # build all apps + packages
bun run typecheck      # tsc --noEmit across workspace
bun run lint           # eslint across workspace
bun run test           # run jest/vitest across workspace
bun run format         # prettier write
```

## Workspace layout

```
bookee/
├── apps/
│   ├── backend/             # NestJS backend (port 3000)
│   ├── operator-cms/        # React+Vite admin portal (port 5173)
│   └── user-web/            # React+Vite customer site (port 5174)
├── packages/
│   ├── config/              # eslint + tsconfig + prettier presets
│   └── shared-types/        # Prisma type re-exports for FE
├── turbo.json               # pipeline definition
└── package.json             # root, workspaces + scripts
```

### Workspace dependencies

```
apps/backend          → packages/shared-types, packages/config
apps/operator-cms → packages/shared-types, packages/config
apps/user-web     → packages/shared-types, packages/config
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
- Husky hooks install on `bun install` via `"prepare": "husky"`.

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
