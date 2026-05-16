## ADDED Requirements

### Requirement: OpenAPI spec export from NestJS

`apps/api` SHALL có CLI script export OpenAPI 3.x spec dưới dạng YAML. Script MUST bootstrap NestJS app context, build document qua `SwaggerModule.createDocument()`, serialize sang YAML và ghi vào `packages/api-client/openapi.yaml`.

#### Scenario: Run export command
- **WHEN** developer chạy `bun run openapi:export` trong `apps/api`
- **THEN** file `packages/api-client/openapi.yaml` được tạo/cập nhật chứa schema mọi controller và DTO, app đóng gracefully

#### Scenario: Skip infrastructure side effects
- **WHEN** export script chạy với env `EXPORT_OPENAPI=1`
- **THEN** các module hạ tầng (DB, Redis…) skip `onModuleInit` để tránh kết nối thật

### Requirement: NestJS operation ID convention

Mọi controller method handle HTTP route MUST có decorator `@ApiOperation({ operationId: '<name>' })` với name theo pattern camelCase `<verb><Resource>[<Action>]`. Verb chuẩn: `get`, `list`, `create`, `update`, `delete`, hoặc verb domain-specific (`cancel`, `confirm`, `search`).

#### Scenario: Get single resource
- **WHEN** controller có method handle `GET /bookings/:id`
- **THEN** method MUST decorated `@ApiOperation({ operationId: 'getBooking' })` và hook generated tên `useGetBooking`

#### Scenario: List collection
- **WHEN** controller có method handle `GET /bookings`
- **THEN** method MUST decorated `@ApiOperation({ operationId: 'listBookings' })` và hook generated tên `useListBookings`

#### Scenario: Action verb
- **WHEN** controller có method handle `POST /bookings/:id/cancel`
- **THEN** method MUST decorated `@ApiOperation({ operationId: 'cancelBooking' })` và hook generated tên `useCancelBooking`

#### Scenario: Missing operationId fails review
- **WHEN** controller method không có `@ApiOperation({ operationId })`
- **THEN** PR review phải reject; hook generated sẽ rơi về tên xấu `useXxxControllerYyy` (smell rõ trong diff)

### Requirement: NestJS DTO annotation discipline

Mọi DTO class dùng làm request body, response body, hoặc query parameter MUST có decorator Swagger:
- Required field: `@ApiProperty()` hoặc class-validator decorator + swagger plugin tự suy luận.
- Optional field: `@ApiPropertyOptional()` hoặc `?` với plugin.

Schema generated MUST phản ánh đúng tính required: required fields appear trong `required: [...]` array của OpenAPI.

#### Scenario: Required field appears as required
- **WHEN** DTO có `@ApiProperty() name: string`
- **THEN** OpenAPI schema có `required: ["name"]` và TypeScript generated type có `name: string` (non-optional)

#### Scenario: Optional field appears as optional
- **WHEN** DTO có `@ApiPropertyOptional() nickname?: string`
- **THEN** OpenAPI schema không include `nickname` trong required list, TypeScript generated type có `nickname?: string`

### Requirement: Orval dual output (React Query + Zod)

`packages/api-client/orval.config.ts` SHALL define đúng 2 output:
- `api` — client `react-query`, httpClient `axios`, mode `tags-split`, mutator trỏ `src/axios-instance.ts`.
- `api-zod` — client `zod`, mode `tags-split`, fileExtension `.zod.ts`.

Cả 2 output ghi vào cùng `src/generated/` để tag folder có cả 2 file song song.

#### Scenario: Codegen produces React Query hooks
- **WHEN** developer chạy `bun run codegen` sau khi có endpoint `GET /api/v1/health`
- **THEN** file `packages/api-client/src/generated/health/health.ts` chứa hook export `useGetHealth` (hoặc tên theo operationId)

#### Scenario: Codegen produces Zod schemas
- **WHEN** developer chạy `bun run codegen` cùng spec trên
- **THEN** file `packages/api-client/src/generated/health/health.zod.ts` chứa Zod schema `GetHealthResponse`

#### Scenario: Tags split organization
- **WHEN** spec có 3 tag (`bookings`, `auth`, `trips`)
- **THEN** `src/generated/` có 3 subfolder tương ứng, mỗi folder có file `<tag>.ts` + `<tag>.zod.ts`

### Requirement: Custom axios mutator

`packages/api-client/src/axios-instance.ts` SHALL export function `axiosInstance<T>(config)` được Orval mutator dùng. Mutator MUST:
- Inject base URL từ `import.meta.env.VITE_API_URL` (fallback `/api`).
- Attach `Authorization: Bearer <token>` nếu có token stored.
- Unwrap response envelope: nếu response body có shape `{ data: T, ... }` trả về `data`, ngược lại trả nguyên body.
- Timeout 30 giây mặc định.

#### Scenario: Auth token attached when present
- **WHEN** mutator gọi với có token được set trước qua `setAuthToken('xyz')`
- **THEN** outgoing request có header `Authorization: Bearer xyz`

#### Scenario: Envelope unwrapped
- **WHEN** BE trả `{ data: { id: 1 }, traceId: 'abc' }`
- **THEN** generated hook trả về `{ id: 1 }` cho component

#### Scenario: No envelope passthrough
- **WHEN** BE trả `{ id: 1, name: 'foo' }` (không có key `data`)
- **THEN** generated hook trả về `{ id: 1, name: 'foo' }` nguyên vẹn

### Requirement: Generated code commit policy

Toàn bộ `packages/api-client/src/generated/` SHALL được commit vào git. Mọi file MUST có header comment chỉ rõ auto-generated. ESLint MUST ignore folder này.

#### Scenario: Generated files committed
- **WHEN** developer chạy `git status` sau `bun run codegen`
- **THEN** `packages/api-client/src/generated/` có file changes nếu spec thay đổi, không có file nào trong `.gitignore`

#### Scenario: ESLint skips generated
- **WHEN** `bun run lint` chạy toàn workspace
- **THEN** file trong `packages/api-client/src/generated/` không bị lint check

### Requirement: Public package API

`packages/api-client/src/index.ts` SHALL re-export:
- Toàn bộ hooks và Axios functions từ `src/generated/**/*.ts` (trừ `.zod.ts`).
- Toàn bộ Zod schemas qua subpath export `@bookee/api-client/zod`.
- `axiosInstance`, `setAuthToken` từ `src/axios-instance.ts`.

`package.json` MUST khai exports map cho cả `.` và `./zod`.

#### Scenario: FE imports hook
- **WHEN** code trong `apps/user-web` viết `import { useGetHealth } from '@bookee/api-client'`
- **THEN** TypeScript resolve và type-check thành công

#### Scenario: FE imports Zod schema
- **WHEN** code viết `import { GetHealthResponse } from '@bookee/api-client/zod'`
- **THEN** import resolve về file `.zod.ts` tương ứng

### Requirement: FE consumption pattern

Cả `apps/operator-cms` và `apps/user-web` SHALL có dep `"@bookee/api-client": "workspace:*"` và SHALL có ít nhất 1 component sample dùng hook generated để verify end-to-end pipeline.

#### Scenario: Sample component uses generated hook
- **WHEN** user mở landing page của user-web (dev mode, api running)
- **THEN** trang gọi `useGetHealth()` và hiển thị status từ response
