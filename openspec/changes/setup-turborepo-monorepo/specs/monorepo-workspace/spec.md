## ADDED Requirements

### Requirement: Bun workspace structure

Hệ thống SHALL có root `package.json` khai báo `workspaces` bao gồm `apps/*` và `packages/*`. Mỗi sub-package MUST có `package.json` riêng với name kebab-case có prefix `@bookee/`.

#### Scenario: Root install resolves all workspaces
- **WHEN** developer chạy `bun install` từ root
- **THEN** Bun resolve toàn bộ dependencies cho `apps/*` và `packages/*`, sinh `bun.lock` ở root, và link symlink intra-workspace qua `node_modules`

#### Scenario: Intra-workspace dependency via workspace protocol
- **WHEN** một app khai báo dependency `"@bookee/shared-types": "workspace:*"`
- **THEN** Bun link sang folder `packages/shared-types` trong cùng workspace, không pull từ npm registry

### Requirement: Turborepo pipeline

Hệ thống SHALL có `turbo.json` ở root định nghĩa tasks: `build`, `dev`, `lint`, `typecheck`, `test`, `db:generate`. Mỗi task MUST khai báo dependencies (`dependsOn`) và outputs phù hợp cho caching.

#### Scenario: Build executes in topological order
- **WHEN** developer chạy `bun run build` từ root
- **THEN** Turbo chạy build cho `packages/*` trước `apps/*` theo dependency graph; build cache được lưu nếu inputs không đổi

#### Scenario: Dev runs apps in parallel
- **WHEN** developer chạy `bun run dev` từ root
- **THEN** Turbo khởi 3 process dev (api, operator-cms, user-web) song song với persistent watch mode, log gắn prefix theo app

#### Scenario: db:generate runs before typecheck
- **WHEN** developer chạy `bun run typecheck` từ root sau khi sửa Prisma schema
- **THEN** Turbo chạy `db:generate` trước, sinh `@prisma/client` types, sau đó mới chạy `tsc --noEmit` cho các app

### Requirement: Three app skeleton

Hệ thống SHALL có 3 app sẵn sàng chạy:
- `apps/api` (NestJS với SWC builder) — endpoint `GET /health` trả `{ "status": "ok" }`.
- `apps/operator-cms` (React + Vite) — render landing page placeholder.
- `apps/user-web` (React + Vite) — render landing page placeholder.

#### Scenario: API health endpoint
- **WHEN** developer chạy `bun run dev` và gọi `curl http://localhost:3000/health`
- **THEN** server trả JSON `{ "status": "ok" }` với status code 200

#### Scenario: Operator CMS loads
- **WHEN** developer mở `http://localhost:5173`
- **THEN** trang load thành công, hiển thị placeholder "Operator CMS"

#### Scenario: User web loads
- **WHEN** developer mở `http://localhost:5174`
- **THEN** trang load thành công, hiển thị placeholder "Bookee"

### Requirement: Shared packages

Hệ thống SHALL có 2 shared package:
- `@bookee/shared-types` — re-export type từ `@prisma/client` (chỉ TypeScript types, không runtime code).
- `@bookee/config` — chứa preset cho ESLint, Prettier, TSConfig.

#### Scenario: FE imports type from shared-types
- **WHEN** code trong `apps/user-web` import `import type { User } from '@bookee/shared-types'`
- **THEN** TypeScript resolve type thành công, build bundle KHÔNG include `@prisma/client` runtime

#### Scenario: App extends shared tsconfig
- **WHEN** `apps/api/tsconfig.json` có `"extends": "@bookee/config/tsconfig/nestjs.json"`
- **THEN** TypeScript apply strict mode + decorator metadata từ base config

### Requirement: Frontend routing and data fetching baseline

Cả `apps/operator-cms` và `apps/user-web` SHALL setup sẵn React Router v6 (data router API) và TanStack Query v5 (React Query) ở entry point. Một QueryClient duy nhất MUST được provide qua context.

#### Scenario: Router renders matching route
- **WHEN** user navigate đến `/` của operator-cms
- **THEN** RouterProvider render component placeholder cho route `/`

#### Scenario: QueryClient available in components
- **WHEN** component dùng `useQueryClient()` ở bất kỳ vị trí nào trong app
- **THEN** hook trả về QueryClient instance đã configured (staleTime: 30s, retry: 1, refetchOnWindowFocus: false)

#### Scenario: React Query devtools only in dev
- **WHEN** app build cho production
- **THEN** bundle KHÔNG include `@tanstack/react-query-devtools` (tree-shaken qua dynamic import + DEV flag)
