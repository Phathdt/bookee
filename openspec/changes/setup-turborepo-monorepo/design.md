## Context

Repo trống, branch `main`. User chọn stack:
- Runtime + package manager: **Bun**
- Monorepo orchestrator: **Turborepo**
- Backend: **NestJS** + **Prisma**
- Frontend (x2): **React + Vite + React Router v6 + TanStack Query v5**

Mục tiêu của change này là dựng skeleton, KHÔNG implement business logic. Mọi feature thuộc về change `multi-operator-trip-booking-app` sẽ implement sau đó vào các app đã tồn tại.

## Goals / Non-Goals

**Goals:**
- Cấu trúc workspace có thể `bun install` ở root → mọi app/package install xong.
- `bun run dev` ở root chạy song song dev server của cả 3 app qua Turborepo.
- `bun run lint`, `bun run typecheck`, `bun run build` chạy nhất quán toàn workspace.
- Shared TS config + ESLint config dùng chung qua `packages/config`.
- Shared types từ Prisma export sang FE chỉ ở dạng type (không runtime).
- Husky pre-commit chỉ lint file thay đổi (lint-staged).
- Apps frontend có routing scaffold + QueryClient provider, nhưng routes/pages còn rỗng.
- Apps backend có NestJS skeleton với 1 health endpoint `GET /health` để verify runtime.

**Non-Goals:**
- Không setup DB connection thật (Prisma schema sẽ là placeholder rỗng).
- Không implement auth, business modules, payment, etc.
- Không setup CI/CD (làm ở change riêng).
- Không deploy lên hạ tầng production.
- Không setup Docker compose (làm ở change riêng khi thêm Postgres/Redis).

## Decisions

### 1. Bun làm package manager + runtime, không dùng pnpm

**Quyết định**: Workspace dùng `workspaces` field trong `package.json` (Bun-native format). Lockfile: `bun.lock` (text-based, diff-friendly).

**Lý do**: User chỉ định Bun. Bun có built-in workspaces tương thích npm-style, nhanh hơn pnpm/npm đáng kể ở `install` và `run`. Một tool đỡ phải nhớ.

**Trade-off**: 
- Một số package native trên npm có thể có quirks với Bun (đặc biệt bcrypt, sharp, node-gyp dependents) — nếu gặp, fallback `bunx --bun-compat` hoặc dùng alternative thuần JS (ví dụ `bcryptjs` thay `bcrypt`).
- Turborepo native binary support Bun bình thường (`turbo` không phụ thuộc Node runtime).

### 2. Cấu trúc thư mục

```
bookee/
├── apps/
│   ├── api/                    # NestJS
│   ├── operator-cms/           # React+Vite admin
│   └── user-web/               # React+Vite customer
├── packages/
│   ├── shared-types/           # DTO + Prisma types re-export
│   └── config/
│       ├── eslint/             # shared eslint preset
│       ├── tsconfig/           # base tsconfig(s)
│       └── prettier/           # prettier config
├── package.json                # root, workspaces
├── turbo.json
├── bun.lock
├── .bun-version                # pin bun version
├── .gitignore
├── .editorconfig
├── README.md
└── openspec/                   # existing
```

**Lý do**:
- `apps/` cho deployable units, `packages/` cho lib chia sẻ — convention chuẩn turborepo.
- `packages/config` gộp toàn bộ dev tooling preset vào 1 chỗ thay vì tách riêng `eslint-config`, `tsconfig` — vì cùng concern (dev tooling), giảm số package phải maintain.

### 3. TypeScript config hierarchy

**Quyết định**: 
- `packages/config/tsconfig/base.json` — strict mode, ES2022 target, no `any`, exactOptionalPropertyTypes.
- `packages/config/tsconfig/react.json` — extends base + JSX react-jsx + DOM lib.
- `packages/config/tsconfig/nestjs.json` — extends base + emitDecoratorMetadata + experimentalDecorators + module commonjs.
- Mỗi app/package có `tsconfig.json` riêng chỉ `extends` + override path mapping.

**Lý do**: Strict mode đồng bộ tránh "đảo TS" giữa các app. NestJS cần decorator metadata; React cần JSX — không thể dùng chung một file.

### 4. ESLint flat config

**Quyết định**: Dùng ESLint v9 flat config (`eslint.config.js`). Preset chung tại `packages/config/eslint/` export 3 preset: `base`, `react`, `nestjs`. Mỗi app import preset tương ứng.

**Lý do**: ESLint legacy `.eslintrc` đã deprecated. Flat config dễ compose hơn cho monorepo.

### 5. Prisma đặt trong apps/api, types chia sẻ qua packages/shared-types

**Quyết định**: 
- Prisma schema + generated client nằm trong `apps/api/prisma/`.
- `apps/api/package.json` có script `postinstall: prisma generate`.
- `packages/shared-types` re-export chỉ TypeScript types từ `@prisma/client` qua `export type { User, Booking, ... } from '@prisma/client'` (KHÔNG export runtime).
- FE app import từ `@bookee/shared-types`, không trực tiếp từ `@prisma/client` (tránh bundle Prisma runtime vào browser).

**Lý do**: Single source of truth cho domain types — schema thay đổi, FE biết ngay qua TS error. Tách runtime/type giữ bundle FE nhẹ.

**Phương án thay thế**: Đặt Prisma schema ở `packages/db/` riêng — đẹp về mặt module nhưng phức tạp hơn cho 3 app size hiện tại. YAGNI.

### 6. React Router + React Query setup pattern

**Quyết định** (áp dụng cho cả 2 FE app):
- `main.tsx` wrap toàn app với `<QueryClientProvider>` + `<RouterProvider>`.
- Router dùng `createBrowserRouter` với route objects (data router API).
- QueryClient cấu hình: `staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: false` (defaults sane cho domain booking).
- Devtools (`@tanstack/react-query-devtools`) chỉ load trong dev (qua dynamic import + `import.meta.env.DEV`).

**Lý do**: Data router API mạnh hơn (loader/action), tương thích tốt với React Query qua `queryClient.ensureQueryData` trong loader nếu cần prefetch.

### 7. Bun + NestJS + SWC compiler

**Quyết định**: 
- NestJS dùng **SWC** thay vì tsc làm compiler (nest CLI có sẵn flag `--builder swc`).
- `nest-cli.json` cấu hình:
  ```json
  {
    "compilerOptions": {
      "builder": "swc",
      "typeCheck": true
    }
  }
  ```
- `.swcrc` ở `apps/api/` với:
  - `jsc.parser.syntax: typescript`, `decorators: true`, `dynamicImport: true`.
  - `jsc.transform.legacyDecorator: true`, `decoratorMetadata: true` (BẮT BUỘC cho DI của NestJS).
  - `jsc.target: es2022`.
  - `module.type: commonjs` (NestJS expect CJS interop).
- Script `dev`: `nest start --builder swc --watch` (SWC watch ~10x nhanh hơn tsc).
- Script `build`: `nest build --builder swc`.
- Script `start:prod`: `bun dist/main.js`.
- `typeCheck: true` trong nest-cli giữ SWC chỉ transpile, còn type check vẫn qua tsc song song (caught errors vẫn fail build).

**Lý do**: 
- SWC nhanh hơn tsc 20-70x ở stage transpile — feedback loop dev tốt hơn nhiều.
- Bun runtime + SWC compile là combo phổ biến cho NestJS hiện đại, tránh các bug Bun-native bundle với decorator.
- `decoratorMetadata: true` đảm bảo reflect-metadata vẫn emit đúng cho DI container của Nest.

**Risk**: 
- SWC không hỗ trợ const enum (Nest core không dùng — OK).
- Phải cài thêm `@swc/cli` + `@swc/core` + `@swc-node/register` (cho test ts-jest tương đương).
- Type errors chỉ catch ở pass tsc — nếu disable `typeCheck`, lỗi TS qua được. Giữ `typeCheck: true`.

### 8. Bun runtime — chạy code đã build, không chạy TS trực tiếp

**Quyết định**: 
- Dev: nest CLI tự quản lý watch + compile qua SWC, runtime là Node-compat (nest start dùng Node).
- Production: `bun dist/main.js` — Bun chạy JS đã compile.

**Lý do**: Tránh đôi đường (Bun runtime + nest watch + SWC compile) gây conflict. Bun ở production chạy JS thuần, perf cao, không phụ thuộc decorator quirks lúc runtime.

**Trade-off**: Mất khả năng "Bun chạy TS trực tiếp" — nhưng đổi lại sự ổn định cho NestJS DI.

### 9. Turbo pipeline

```jsonc
// turbo.json
{
  "tasks": {
    "build": { "dependsOn": ["^build", "db:generate"], "outputs": ["dist/**", ".next/**", "build/**"] },
    "dev":   { "cache": false, "persistent": true },
    "lint":  { "outputs": [] },
    "typecheck": { "dependsOn": ["^build", "db:generate"], "outputs": [] },
    "test":  { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "db:generate": { "cache": false, "outputs": ["node_modules/.prisma/**"] }
  }
}
```

**Lý do**: 
- `^build` ensure shared packages build trước app.
- `db:generate` chạy trước `build`/`typecheck` để có types Prisma.
- `dev` persistent + no cache.
- `db:generate` không cache vì cần re-run khi schema đổi (Turbo không track schema.prisma trong inputs trừ khi config).

### 10. Husky + lint-staged

**Quyết định**: Husky v9 + lint-staged. Pre-commit hook: chạy `eslint --fix` + `prettier --write` chỉ trên file staged. Không chạy test pre-commit (chậm, làm CI).

**Lý do**: Giữ commit nhanh. Test sẽ block ở push hook hoặc CI.

## Risks / Trade-offs

- **[Bun + NestJS instability]** → Mitigation: Có script fallback `bun:node-compat` chạy qua node-via-bun-shim nếu phát hiện issue. Document trong README.
- **[Prisma engine native binary trên Bun]** → Mitigation: Prisma 5.10+ chính thức hỗ trợ Bun; pin version cụ thể trong root package.json `overrides`.
- **[ESLint v9 flat config compat với NestJS/Vite]** → Mitigation: Verify version compat trước khi pin; nếu plugin chưa migrate, dùng `FlatCompat` từ `@eslint/eslintrc` làm bridge.
- **[Workspace dependency resolution]** → Mitigation: Dùng `workspace:*` protocol cho intra-monorepo deps; tránh version drift.
- **[Type-only re-export accident leak runtime]** → Mitigation: Set `"verbatimModuleSyntax": true` trong tsconfig của shared-types để compiler bắt buộc dùng `import type`.

## Migration Plan

Greenfield — không có gì để migrate. Rollback = `git revert`. Verify thành công bằng cách:
1. `bun install` ở root chạy thành công, sinh `bun.lock`.
2. `bun run dev` từ root mở được 3 app cùng lúc (api ở :3000, operator-cms ở :5173, user-web ở :5174).
3. `curl localhost:3000/health` trả `{ "status": "ok" }`.
4. Visit operator-cms và user-web trong browser thấy landing page placeholder.
5. `bun run lint && bun run typecheck && bun run build` từ root pass hết.

## Open Questions

- Có cần i18n setup sẵn cho 2 FE app không (react-i18next)? **Defer** — thêm khi cần.
- Tailwind hay CSS Modules cho FE? **Đề xuất Tailwind** — nhanh prototype, dùng được cho cả 2 app. Confirm với user ở apply phase nếu cần.
- HTTP client cho FE: native fetch + ky/axios? **Đề xuất ky** (lightweight, fetch-based, tốt cho React Query).
- Có cần shared `packages/api-client` (auto-generated từ OpenAPI) ngay không? **Defer** — đến khi có API thật.
