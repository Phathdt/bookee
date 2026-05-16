## Why

Hai FE app (operator-cms, user-web) sẽ gọi rất nhiều endpoint của NestJS API. Nếu để mỗi app tự viết tay axios call + type, sẽ sinh code lặp, dễ drift khỏi contract của BE, và mỗi lần đổi DTO phải sửa nhiều nơi. Áp dụng workflow OpenAPI → Orval → React Query hooks + Zod schemas (tham khảo blog kanesa.xyz) cho ra single source of truth: BE thay đổi → regenerate → FE tự catch lỗi qua TypeScript + Zod.

## What Changes

- Tạo package mới `@bookee/api-client` chứa:
  - File `openapi.yaml` được commit (generated từ NestJS).
  - Generated React Query hooks (output từ Orval, client = `react-query`, httpClient = `axios`).
  - Generated Zod schemas (output thứ hai từ Orval, client = `zod`).
  - Custom axios mutator để handle base URL, auth header, response envelope unwrap.
  - `orval.config.ts` với 2 output (api + api-zod), `mode: tags-split`.
- Trong `apps/api`:
  - Cài `@nestjs/swagger` + bật Swagger module.
  - Tạo CLI command `bun run openapi:export` dump `openapi.yaml` vào `packages/api-client/openapi.yaml`.
  - Mọi DTO MUST có decorator `@ApiProperty()` với required flag rõ ràng (tránh tất cả field thành optional).
- Trong `apps/operator-cms` và `apps/user-web`:
  - Thêm dep `"@bookee/api-client": "workspace:*"`.
  - Import hooks `useGetXxx`/`usePostXxx` và Zod schemas thay vì viết axios tay.
  - Cấu hình base URL qua env (Vite `import.meta.env.VITE_API_URL`).
- Trong `turbo.json`:
  - Thêm task `openapi:export` (output: `packages/api-client/openapi.yaml`).
  - Thêm task `codegen` (depends on `openapi:export`, output: `packages/api-client/src/generated/**`).
  - `build`/`typecheck` của FE depend on `^codegen`.
- CI guard (làm sau, ngoài scope change này): job kiểm `bun run codegen` không có diff so với code đã commit.

## Capabilities

### New Capabilities

- `openapi-codegen`: Workflow tự động sinh React Query hooks + Zod schemas từ OpenAPI spec do NestJS xuất ra, đóng gói trong shared package dùng chung cho mọi FE app.

### Modified Capabilities

- `monorepo-workspace`: Thêm package mới `@bookee/api-client` vào workspace; thêm task `openapi:export` và `codegen` vào turbo pipeline; FE app build phụ thuộc codegen.

## Impact

- **Codebase**: Tạo `packages/api-client/` mới. Sửa `apps/api` (cài swagger + CLI export), sửa `apps/operator-cms` và `apps/user-web` (consume hooks). Sửa `turbo.json` (thêm 2 task).
- **Dev workflow**: Loop mới khi đổi API:
  1. Sửa controller/DTO trong `apps/api`.
  2. Chạy `bun run openapi:export` → cập nhật openapi.yaml.
  3. Chạy `bun run codegen` → cập nhật generated hooks/zod.
  4. Commit cả 2 file (yaml + generated) cùng với code controller.
  5. FE pick up type mới qua TypeScript ngay lập tức.
- **Dependencies thêm**: 
  - `apps/api`: `@nestjs/swagger`, `js-yaml`.
  - `packages/api-client`: `orval` (dev), `axios`, `zod`, `@tanstack/react-query` (peer).
- **Generated code in git**: Commit để PR diff hiện thay đổi contract; tăng repo size nhưng đáng giá.
- **Performance**: Bundle FE tăng do Zod schemas — chấp nhận được vì có thể optional-validate (gọi `.parse()` chỉ ở boundary thay vì mọi response).
- **Backward compatibility**: N/A — vẫn trong phase setup, chưa có FE code consume API.
