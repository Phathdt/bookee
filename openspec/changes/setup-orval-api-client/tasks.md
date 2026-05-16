## 1. NestJS Swagger Integration

- [ ] 1.1 Cài `@nestjs/swagger` + `swagger-ui-express` + `js-yaml` + `@types/js-yaml` trong `apps/api`
- [ ] 1.2 Bật swagger plugin trong `apps/api/nest-cli.json` (`plugins: [{ name: '@nestjs/swagger', options: { introspectComments: true } }]`)
- [ ] 1.3 Cập nhật `apps/api/src/main.ts`: setup `app.setGlobalPrefix('api/v1')`, mount SwaggerModule tại `/docs` khi `NODE_ENV !== 'production'`
- [ ] 1.4 Thêm `@ApiTags('health')` và `@ApiOperation({ operationId: 'getHealth' })` + `@ApiResponse({ status: 200, type: HealthResponseDto })` cho `health.controller.ts` (operationId convention: camelCase `<verb><Resource>`)
- [ ] 1.5 Tạo `apps/api/src/health/dto/health-response.dto.ts` với `@ApiProperty() status: 'ok'`
- [ ] 1.6 Verify mở `http://localhost:3000/docs` thấy Swagger UI với endpoint health

## 2. OpenAPI Export Script

- [ ] 2.1 Tạo `apps/api/scripts/export-openapi.ts`:
  - Bootstrap qua `NestFactory.create(AppModule, { logger: false })`
  - Build document `SwaggerModule.createDocument(app, swaggerConfig)`
  - Serialize `js-yaml.dump(document)`
  - Write tới `../../packages/api-client/openapi.yaml`
  - `await app.close()`
- [ ] 2.2 Thêm guard env `EXPORT_OPENAPI=1` để các module hạ tầng skip `onModuleInit` (placeholder hiện chưa có module nào — sẽ wire khi thêm DB)
- [ ] 2.3 Thêm script `openapi:export` trong `apps/api/package.json` → `EXPORT_OPENAPI=1 bun run scripts/export-openapi.ts`
- [ ] 2.4 Test chạy `bun run openapi:export` từ `apps/api`, verify file `packages/api-client/openapi.yaml` chứa path `/api/v1/health`

## 3. New Package: @bookee/api-client

- [ ] 3.1 Tạo folder `packages/api-client/` với `package.json` (name `@bookee/api-client`, private, type `module`)
- [ ] 3.2 Thiết lập exports map: `.` → `./src/index.ts`, `./zod` → `./src/zod-index.ts`
- [ ] 3.3 Cài deps: `axios`, `zod`, `@tanstack/react-query` (peer)
- [ ] 3.4 Cài devDeps: `orval`, `typescript`
- [ ] 3.5 Tạo `packages/api-client/tsconfig.json` extends `@bookee/config/tsconfig/react.json`
- [ ] 3.6 Tạo `packages/api-client/eslint.config.js` import `@bookee/config/eslint/react`, ignore `src/generated/**`

## 4. Custom Axios Mutator

- [ ] 4.1 Tạo `packages/api-client/src/axios-instance.ts`:
  - Export `AXIOS_INSTANCE` (axios.create với baseURL từ `import.meta.env.VITE_API_URL` fallback `/api`)
  - Request interceptor inject `Authorization: Bearer <token>` từ store nội bộ
  - Export `axiosInstance<T>(config)` — unwrap envelope `{ data: T }` nếu có
  - Export `setAuthToken(token: string | null)` để FE app set sau login
- [ ] 4.2 Thêm timeout 30 giây mặc định
- [ ] 4.3 Thêm response interceptor map BE error envelope `{ error, traceId }` → throw Error chuẩn

## 5. Orval Configuration

- [ ] 5.1 Tạo `packages/api-client/orval.config.ts`:
  - Entry `api`: input `./openapi.yaml`, output mode `tags-split`, target `./src/generated`, client `react-query`, httpClient `axios`, mutator trỏ `./src/axios-instance.ts` export name `axiosInstance`
  - Entry `api-zod`: input `./openapi.yaml`, output mode `tags-split`, target `./src/generated`, client `zod`, fileExtension `.zod.ts`
  - Bật `override.query.useQuery`, `useMutation`, default `staleTime: 30_000`
  - Bật `prettier: true` để format output
- [ ] 5.2 Thêm script `codegen` trong `packages/api-client/package.json` → `orval --config ./orval.config.ts`
- [ ] 5.3 Test chạy `bun run codegen` sinh `src/generated/health/health.ts` (hooks) + `health.zod.ts` (schemas)

## 6. Package Public API

- [ ] 6.1 Tạo `packages/api-client/src/index.ts`:
  - Re-export mọi file `*.ts` từ `src/generated/**` (trừ `.zod.ts`) qua barrel
  - Re-export `axiosInstance`, `setAuthToken` từ `./axios-instance`
- [ ] 6.2 Tạo `packages/api-client/src/zod-index.ts`:
  - Re-export mọi file `*.zod.ts` từ `src/generated/**` qua barrel
- [ ] 6.3 Thêm `src/generated/` vào `.gitattributes` với `linguist-generated=true` (GitHub hiển thị diff collapsed)
- [ ] 6.4 Thêm header comment guard vào root `index.ts`/`zod-index.ts` warning "DO NOT manually edit src/generated/"

## 7. Turborepo Pipeline Update

- [ ] 7.1 Thêm task `openapi:export` vào `turbo.json` (dependsOn `@bookee/api#build`, cache false, outputs `packages/api-client/openapi.yaml`)
- [ ] 7.2 Thêm task `codegen` (dependsOn `openapi:export`, inputs `openapi.yaml`, `orval.config.ts`, `src/axios-instance.ts`, outputs `src/generated/**`)
- [ ] 7.3 Update task `build` cho FE app: thêm `^codegen` vào dependsOn
- [ ] 7.4 Update task `typecheck` cho FE app: thêm `^codegen` vào dependsOn
- [ ] 7.5 Thêm root scripts: `openapi:export`, `codegen` chạy qua `turbo run`

## 8. FE Apps Consume API Client

- [ ] 8.1 Thêm `"@bookee/api-client": "workspace:*"` vào dep của `apps/operator-cms` và `apps/user-web`
- [ ] 8.2 Thêm biến `VITE_API_URL=http://localhost:3000/api/v1` vào `.env.example` của cả 2 FE app
- [ ] 8.3 Update `apps/user-web/src/pages/landing.tsx`: dùng `useGetHealth()` từ `@bookee/api-client`, render status
- [ ] 8.4 Update `apps/operator-cms/src/pages/landing.tsx`: tương tự
- [ ] 8.5 Cấu hình CORS trong `apps/api/src/main.ts` cho phép origin `localhost:5173` và `localhost:5174` trong dev

## 9. Documentation

- [ ] 9.1 Tạo `packages/api-client/README.md`: mô tả workflow regenerate, conventions cho controller/DTO
- [ ] 9.2 Cập nhật README root: thêm section "API Client Codegen" giải thích loop `controller change → openapi:export → codegen → FE consumes`
- [ ] 9.3 Document convention DTO annotation (`@ApiProperty`, `@ApiPropertyOptional`, `@ApiTags`)
- [ ] 9.4 Document operationId convention: pattern `<verb><Resource>[<Action>]` camelCase, ví dụ `getHealth`, `listBookings`, `createBooking`, `cancelBooking`

## 10. End-to-End Verification

- [ ] 10.1 Xoá `packages/api-client/src/generated/`, chạy `bun run openapi:export && bun run codegen` từ root — regenerate clean
- [ ] 10.2 Chạy `bun run typecheck` ở root — toàn workspace pass
- [ ] 10.3 Chạy `bun run build` ở root — pass cho cả api + 2 FE app
- [ ] 10.4 Chạy `bun run dev` ở root — mở browser `:5173` và `:5174`, verify thấy "status: ok" trên màn (call API thật qua hook generated)
- [ ] 10.5 Sửa thử `HealthResponseDto` thêm field `timestamp`, rerun codegen, verify FE thấy field mới qua TypeScript
- [ ] 10.6 Verify Zod schema generated: import `GetHealthResponse` từ `@bookee/api-client/zod`, parse mock data thành công
