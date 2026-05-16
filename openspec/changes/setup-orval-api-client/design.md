## Context

Change này build trên trên nền `setup-turborepo-monorepo` (đã có 3 apps + 2 packages). Tham khảo trực tiếp pattern từ blog https://blog.kanesa.xyz/blog/go-openapi-orval-type-safe-api-client-react-query-zod nhưng đổi BE từ Go sang NestJS:

| Component | Blog (Go) | Của chúng ta (NestJS) |
|---|---|---|
| OpenAPI source | oaswrap/spec + fiberopenapi (`option.Response(200, dto)`) | `@nestjs/swagger` decorators (`@ApiResponse`, `@ApiProperty`) |
| Spec export | `go run . openapi-export` | NestJS bootstrap-mode CLI dump qua `SwaggerModule.createDocument()` |
| Output file | `docs/openapi.yaml` | `packages/api-client/openapi.yaml` |
| Codegen | Orval (react-query + zod) | **Giống** — Orval với 2 output |

Decision đã chốt qua hỏi đáp:
- HTTP client: **axios** với custom mutator.
- Generated code: **commit vào git**.

## Goals / Non-Goals

**Goals:**
- Một command `bun run codegen` ở root tạo lại toàn bộ hooks + zod từ openapi.yaml.
- Hai FE app import hooks từ `@bookee/api-client` thay vì viết axios tay.
- Mọi DTO của NestJS có TypeScript type được sinh chuẩn xác (required vs optional đúng).
- Custom mutator handle: base URL, auth bearer header, response envelope unwrap.
- Devtools `pino-pretty`-style log mỗi request trong dev.
- Generated code không bị developer sửa tay (header comment cảnh báo + ESLint ignore).

**Non-Goals:**
- Chưa implement endpoint thật — `apps/api` mới chỉ có `/health`. Sau change này, mỗi khi controller mới được thêm sẽ tự động cập nhật hook.
- Chưa setup CI guard kiểm drift (làm change riêng).
- Chưa implement runtime Zod validation tự động ở mọi response (chỉ cung cấp schema, optional dùng).
- Chưa hỗ trợ multiple environment swagger doc (chỉ 1 spec cho mọi env).
- Không sinh mock server từ OpenAPI.

## Decisions

### 1. Vị trí và scope của `@bookee/api-client`

**Quyết định**: Package mới `packages/api-client/` chứa:
- `openapi.yaml` (single source of truth, committed).
- `orval.config.ts` (config codegen).
- `src/axios-instance.ts` (custom mutator).
- `src/generated/` (output từ Orval, committed, ESLint ignored).
- `src/index.ts` (barrel re-export hooks và zod schemas).

**Lý do**: Đặt yaml trong package giữ codegen tự chứa — không phải reference path lằng nhằng. FE app chỉ cần `@bookee/api-client` để có cả hooks và schemas.

**Phương án thay thế**: Tách thành 2 package (`api-client` + `api-schemas`) — over-engineering, YAGNI.

### 2. NestJS Swagger setup

**Quyết định**:
- Cài `@nestjs/swagger` và `swagger-ui-express`.
- Trong `main.ts` (chỉ khi `NODE_ENV !== production` hoặc qua env flag), mount Swagger UI tại `/docs` để dev xem.
- Tạo CLI script `apps/api/scripts/export-openapi.ts`:
  ```
  bootstrap app trong NestFactory.create({ logger: false })
  build document qua SwaggerModule.createDocument()
  serialize sang YAML qua js-yaml
  write file ../../packages/api-client/openapi.yaml
  await app.close()
  ```
- Script chạy qua `bun run scripts/export-openapi.ts` (Bun chạy TS trực tiếp OK cho script ngoài runtime app).

**Lý do**: Bootstrap app trong CLI để decorator metadata được scan đầy đủ — không cần parse AST. Đóng app sau khi xuất tránh hang.

**Pitfall**: Module nào có side effect (kết nối DB, Redis) sẽ chạy trong export. Giải pháp: dùng `Test.createTestingModule()` hoặc thiết lập `EXPORT_OPENAPI=1` env để skip onModuleInit ở các module hạ tầng.

### 3. DTO `@ApiProperty` discipline — required mặc định

**Quyết định**: 
- Mọi DTO field bắt buộc có decorator `@ApiProperty({ required: true })` (hoặc dùng `@ApiPropertyOptional()` cho optional).
- Cấu hình `SwaggerModule.createDocument()` với option `deepScanRoutes: true`.
- Bật ESLint rule custom (hoặc convention enforced trong code review) yêu cầu mọi class DTO có ít nhất 1 decorator swagger.

**Lý do**: Blog cảnh báo rõ — không khai required → mọi field thành optional ở FE → TypeScript inference vô dụng. Đây là pitfall phổ biến nhất.

**Phương án thay thế**: Dùng `class-validator` decorator (`@IsNotEmpty()`, `@IsOptional()`) làm source — `@nestjs/swagger` plugin có thể auto-infer từ class-validator. **Khuyến nghị**: Bật cả `nestjs-cli plugin` cho `@nestjs/swagger` trong `nest-cli.json` (`"plugins": [{"name": "@nestjs/swagger", "options": {"introspectComments": true}}]`) — auto add @ApiProperty từ TS types, giảm boilerplate.

### 4. Orval config — 2 output cùng spec

**Quyết định**: `orval.config.ts` định nghĩa 2 entries:
```typescript
{
  'api': {
    input: 'openapi.yaml',
    output: {
      mode: 'tags-split',
      target: 'src/generated',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: { path: 'src/axios-instance.ts', name: 'axiosInstance' },
        query: {
          useQuery: true,
          useInfinite: false,
          useMutation: true,
          options: { staleTime: 30_000 },
        },
      },
      prettier: true,
    },
  },
  'api-zod': {
    input: 'openapi.yaml',
    output: {
      mode: 'tags-split',
      target: 'src/generated',
      client: 'zod',
      fileExtension: '.zod.ts',
    },
  },
}
```

**Lý do**: 
- `tags-split` tổ chức theo OpenAPI tag (mỗi NestJS controller dùng `@ApiTags('bookings')` → file `bookings/bookings.ts` + `bookings/bookings.zod.ts`).
- Mutator decouple HTTP layer khỏi generated code.
- Query options default chỉ là baseline; component vẫn override được.

### 5. Custom axios mutator

**Quyết định**: `src/axios-instance.ts` export:
- `AXIOS_INSTANCE` (raw axios instance, base URL từ env, interceptors).
- `axiosInstance<T>(config)` — wrap, throw nếu BE trả lỗi, unwrap envelope nếu BE bọc `{ data, error, traceId }`.
- Function `setAuthToken(token)` để FE setup token sau login.

**Implementation pattern**:
```typescript
import axios, { AxiosRequestConfig } from 'axios';

const AXIOS_INSTANCE = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 30_000,
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const axiosInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return AXIOS_INSTANCE(config).then(({ data }) => {
    if (data && typeof data === 'object' && 'data' in data) {
      return (data as { data: T }).data;
    }
    return data as T;
  });
};
```

**Lý do**: Single point để inject auth, unwrap envelope, retry strategy, error mapping.

**Trade-off**: Mutator dùng `import.meta.env` — chỉ build được trong môi trường Vite. Nếu sau này có Next.js app, cần config riêng. Chấp nhận hiện tại vì cả 2 FE đều Vite.

### 6. Generated code commit policy

**Quyết định**:
- `src/generated/**` committed.
- Thêm header comment vào file generated (Orval có sẵn): `/* AUTO-GENERATED — DO NOT EDIT */`.
- `.eslintignore` exclude `src/generated/**`.
- ESLint rule cảnh báo nếu file `src/generated/**` bị modify tay (kết hợp git pre-commit).

**Lý do**: PR diff hiện cả contract change (yaml) + impact lên FE (hooks). Reviewer dễ catch breaking change.

**Trade-off**: Tăng repo size; merge conflict ở generated khi 2 branch cùng đổi API. Solution: rule "luôn regenerate sau merge conflict resolution".

### 7. Turborepo pipeline integration

**Quyết định**: Thêm 2 task vào `turbo.json`:
```jsonc
{
  "openapi:export": {
    "dependsOn": ["@bookee/api#build"],
    "outputs": ["packages/api-client/openapi.yaml"],
    "cache": false
  },
  "codegen": {
    "dependsOn": ["openapi:export"],
    "inputs": ["openapi.yaml", "orval.config.ts", "src/axios-instance.ts"],
    "outputs": ["src/generated/**"]
  }
}
```

Và update `build` + `typecheck` của FE app:
```jsonc
{
  "build": { "dependsOn": ["^build", "^codegen"] },
  "typecheck": { "dependsOn": ["^codegen"] }
}
```

**Lý do**: 
- `openapi:export` chạy sau `@bookee/api#build` để đảm bảo TS đã compile (Swagger plugin chạy ở compile-time).
- `codegen` cache theo input yaml + config — chỉ regen khi spec đổi.
- FE phụ thuộc `^codegen` đảm bảo `@bookee/api-client` luôn fresh trước build/typecheck.

**Pitfall**: `openapi:export` cần chạy app trong process — không phù hợp cache. Đặt `cache: false`.

### 8. Versioning và stable query keys

**Quyết định**: 
- OpenAPI spec có `info.version` lấy từ `apps/api/package.json` version.
- Orval generate stable query keys dạng `['/api/v1/bookings', params]` — không phụ thuộc version.
- Khi breaking change, bump major version trong package.json, regenerate, FE caller phải update.

**Lý do**: Query keys ổn định cross-version giúp React Query cache hoạt động đúng ngay cả khi spec thêm field mới (additive change).

## Risks / Trade-offs

- **[Bootstrap app trong CLI script kéo theo side effect (DB connect, Redis)]** → Mitigation: Dùng env `EXPORT_OPENAPI=1`; trong module hạ tầng skip `onModuleInit` khi flag bật. Hoặc dùng `Test.createTestingModule()` ở scripts.
- **[Field optional vì thiếu @ApiProperty]** → Mitigation: Bật swagger CLI plugin (auto infer); ESLint rule custom; checklist PR.
- **[Generated code conflict trong PR merge]** → Mitigation: Convention "luôn `bun run codegen` sau resolve conflict, commit kết quả". Document trong README.
- **[Axios mutator dùng `import.meta.env` không tương thích nếu thêm Next/SSR sau này]** → Mitigation: Refactor mutator thành function accept config (baseURL, getToken) khi cần. Hiện tại YAGNI.
- **[Zod schemas tăng bundle FE]** → Mitigation: Zod tree-shakeable; chỉ import schema cần dùng cho validation. Bundle analysis check sau khi có volume.
- **[Drift: developer sửa controller mà quên regen]** → Mitigation (làm sau): CI job chạy `bun run codegen` rồi `git diff --exit-code`; nếu khác → fail.
- **[Swagger plugin nest-cli interfere với SWC builder]** → Mitigation: Verify `@nestjs/swagger` plugin có support SWC mode (đã có từ v7.x). Nếu vấn đề, fallback `@nestjs/swagger` decorators thủ công (thêm `@ApiProperty()` ở mọi field).

## Migration Plan

Không có code FE đang gọi API tay — apply 1 lần. Verify:
1. `bun run openapi:export` ở root tạo `packages/api-client/openapi.yaml` chứa schema cho `GET /health`.
2. `bun run codegen` ở root sinh `packages/api-client/src/generated/health/health.ts` với hook `useGetHealth()` (hoặc tên tương đương theo OpenAPI operationId).
3. Trong `apps/user-web/src/pages/landing.tsx` thử import + dùng `useGetHealth()` → render "status: ok" trên màn hình.
4. `bun run build` ở root pass cho cả 3 app.

Rollback: `git revert` change. Generated package có thể xoá an toàn vì FE chưa phụ thuộc nhiều.

### 9. Operation ID convention — bắt buộc explicit

**Quyết định**: Mọi controller method MUST có decorator `@ApiOperation({ operationId: '<camelCase>' })`. Tên operationId theo pattern `<verb><Resource>` (ví dụ: `getHealth`, `listBookings`, `createBooking`, `cancelBooking`).

**Lý do**:
- Mặc định NestJS sinh operationId dạng `HealthController_check` → Orval generate hook `useHealthControllerCheck` (xấu, dài, lộ tên class).
- Explicit operationId → hook name `useGetHealth`, sạch và stable cross-refactor (đổi tên class controller không break FE).
- Ổn định query key — đổi controller name không invalidate cache FE.

**Enforcement**: 
- Convention trong PR review.
- (Optional, change sau) Custom ESLint rule hoặc test scan ensure mọi `@Get/@Post/@Put/@Delete` đi kèm `@ApiOperation({ operationId })`.

**Naming rules**:
- `get<Resource>` — single resource by id (GET /bookings/:id → `getBooking`).
- `list<Resources>` — collection (GET /bookings → `listBookings`).
- `create<Resource>` — POST.
- `update<Resource>` — PATCH/PUT single.
- `delete<Resource>` — DELETE.
- `<verb><Resource><Action>` — actions (POST /bookings/:id/cancel → `cancelBooking`).

## Open Questions
- Zod validation runtime: chỉ ở boundary nào? **Đề xuất**: Optional, để FE dev tự gọi `.parse()` khi cần (ví dụ trên data nhạy cảm). Không enforce mặc định.
- Có muốn output thêm MSW handlers cho testing không? Orval support `mock: true`. **Defer** — thêm khi có FE test.
