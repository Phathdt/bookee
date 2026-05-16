## MODIFIED Requirements

### Requirement: Turborepo pipeline

Hệ thống SHALL có `turbo.json` ở root định nghĩa tasks: `build`, `dev`, `lint`, `typecheck`, `test`, `db:generate`, `openapi:export`, `codegen`. Mỗi task MUST khai báo dependencies (`dependsOn`) và outputs phù hợp cho caching. Tasks `build` và `typecheck` của FE app MUST depend on `^codegen` để đảm bảo generated API client luôn fresh.

#### Scenario: Build executes in topological order
- **WHEN** developer chạy `bun run build` từ root
- **THEN** Turbo chạy build cho `packages/*` trước `apps/*` theo dependency graph; build cache được lưu nếu inputs không đổi

#### Scenario: Dev runs apps in parallel
- **WHEN** developer chạy `bun run dev` từ root
- **THEN** Turbo khởi 3 process dev (api, operator-cms, user-web) song song với persistent watch mode, log gắn prefix theo app

#### Scenario: db:generate runs before typecheck
- **WHEN** developer chạy `bun run typecheck` từ root sau khi sửa Prisma schema
- **THEN** Turbo chạy `db:generate` trước, sinh `@prisma/client` types, sau đó mới chạy `tsc --noEmit` cho các app

#### Scenario: openapi:export runs after api build
- **WHEN** developer chạy `bun run openapi:export` từ root
- **THEN** Turbo build `@bookee/api` trước, sau đó chạy script export → `packages/api-client/openapi.yaml` được cập nhật; task này có `cache: false`

#### Scenario: codegen depends on openapi:export and updates generated folder
- **WHEN** developer chạy `bun run codegen` từ root
- **THEN** Turbo đảm bảo `openapi:export` đã chạy (nếu cần), sau đó Orval generate `packages/api-client/src/generated/**`; cache theo inputs `openapi.yaml` + `orval.config.ts`

#### Scenario: FE build awaits codegen
- **WHEN** developer chạy `bun run build` từ root, FE app phụ thuộc `@bookee/api-client`
- **THEN** Turbo chạy `codegen` cho `@bookee/api-client` trước build FE app

### Requirement: Shared packages

Hệ thống SHALL có 3 shared package:
- `@bookee/shared-types` — re-export type từ `@prisma/client` (chỉ TypeScript types, không runtime code).
- `@bookee/config` — chứa preset cho ESLint, Prettier, TSConfig.
- `@bookee/api-client` — chứa OpenAPI spec, Orval config, generated React Query hooks + Zod schemas, custom axios mutator.

#### Scenario: FE imports type from shared-types
- **WHEN** code trong `apps/user-web` import `import type { User } from '@bookee/shared-types'`
- **THEN** TypeScript resolve type thành công, build bundle KHÔNG include `@prisma/client` runtime

#### Scenario: App extends shared tsconfig
- **WHEN** `apps/api/tsconfig.json` có `"extends": "@bookee/config/tsconfig/nestjs.json"`
- **THEN** TypeScript apply strict mode + decorator metadata từ base config

#### Scenario: FE imports hook from api-client
- **WHEN** code trong `apps/operator-cms` viết `import { useGetHealth } from '@bookee/api-client'`
- **THEN** TypeScript resolve hook generated, build pass và hook callable trong React component
