## Why

Project hiện đang trống — chưa có code base, chưa có package.json. Trước khi triển khai bất kỳ feature nào của `multi-operator-trip-booking-app`, cần dựng nền monorepo để 3 ứng dụng (NestJS backend, operator CMS, user web) có thể chia sẻ types/config, build chung qua một orchestrator, và scale ra thêm app/lib mà không phải tổ chức lại sau.

## What Changes

- Khởi tạo Turborepo monorepo với **Bun** workspaces tại root (Bun đảm nhận cả runtime lẫn package manager).
- Tạo 3 apps:
  - `apps/api` — NestJS chạy trên Bun runtime, dùng **Prisma** làm ORM (Postgres sẽ cấu hình ở change sau).
  - `apps/operator-cms` — React + Vite + **React Router v6** + **TanStack Query (React Query) v5**.
  - `apps/user-web` — React + Vite + **React Router v6** + **TanStack Query (React Query) v5**.
- Tạo 2 shared packages:
  - `packages/shared-types` — DTO/contract giữa BE và FE; sẽ chứa Prisma-generated types được re-export an toàn cho FE (chỉ type, không runtime code).
  - `packages/config` — ESLint + TSConfig + Prettier preset dùng chung.
- Cấu hình `turbo.json` với pipeline: `build`, `dev`, `lint`, `test`, `typecheck`, `db:generate` (Prisma) cùng caching.
- Thiết lập TypeScript strict mode đồng bộ cho toàn workspace.
- Thiết lập ESLint + Prettier + Husky pre-commit hook chạy lint trên file thay đổi.
- Tạo `.gitignore`, `.editorconfig`, `.bun-version` (pin version), `.env.example` placeholder.
- Tạo README root mô tả cấu trúc và lệnh phổ biến.

## Capabilities

### New Capabilities

- `monorepo-workspace`: Cấu trúc monorepo với Turborepo + Bun workspaces, định nghĩa cách apps và packages tham chiếu lẫn nhau, pipeline build/dev/lint.
- `shared-tooling`: Cấu hình dev tooling dùng chung (TypeScript, ESLint, Prettier, Husky) được tái sử dụng qua `packages/config`.

### Modified Capabilities

<!-- None — chưa có capability nào tồn tại trước đây. -->

## Impact

- **Codebase**: Tạo cấu trúc thư mục mới từ root. Mọi feature sau này (`multi-operator-trip-booking-app`) sẽ implement bên trong `apps/api`, `apps/operator-cms`, `apps/user-web`.
- **Tooling requirements**: Developer cần cài Bun 1.1+ (curl install script hoặc brew). Không cần Node.js riêng (Bun có Node compat layer).
- **NestJS on Bun risk**: NestJS chính thức target Node — chạy trên Bun nhìn chung OK nhưng một số package native (bcrypt, sharp) có thể cần workaround. Cần verify trong design.
- **Prisma + Bun**: Prisma đã support Bun từ v5.x nhưng cần dùng `prisma generate` qua bunx; engine binary vẫn là native (không phụ thuộc runtime). Generated client export cả runtime + types — cẩn thận chỉ export type ra FE để tránh leak runtime.
- **React Router v6 vs v7**: Hiện tại chọn v6 (stable, ecosystem matured). Có thể upgrade lên v7 (Remix-merged) sau.
- **React Query (TanStack Query v5)**: cần shared QueryClient config, error boundary, devtools dev-only.
- **CI/CD impact (future)**: GitHub Actions cần `oven-sh/setup-bun` action. Turborepo remote cache vẫn hoạt động độc lập với runtime.
- **No external dependencies yet**: Bước này chỉ dựng skeleton — chưa thêm Postgres, Redis, payment SDK… (sẽ làm trong change tiếp theo).
- **Backward compatibility**: N/A — greenfield.
