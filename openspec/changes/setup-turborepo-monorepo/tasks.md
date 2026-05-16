## 1. Root Workspace Setup

- [x] 1.1 Tạo root `package.json` với `name: bookee`, `private: true`, `workspaces: ["apps/*", "packages/*"]`, `packageManager: "bun@1.1.x"`
- [x] 1.2 Tạo `.bun-version` pin version (ví dụ `1.1.38`)
- [x] 1.3 Tạo `.gitignore` (node_modules, dist, .turbo, .env\*, coverage, logs, OS files)
- [x] 1.4 Tạo `.editorconfig` (indent 2 space, utf-8, lf)
- [x] 1.5 Tạo `.env.example` placeholder ở root
- [x] 1.6 Cài Turborepo dev dep ở root (`bun add -d turbo`)
- [x] 1.7 Tạo `turbo.json` với tasks: build, dev, lint, typecheck, test, db:generate (như Decision 9)
- [x] 1.8 Thêm root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`
- [x] 1.9 Tạo README.md root mô tả cấu trúc + lệnh phổ biến

## 2. Shared Config Package (packages/config)

- [x] 2.1 Tạo `packages/config/package.json` với name `@bookee/config`, private, exports map cho `eslint/*`, `tsconfig/*`, `prettier`
- [x] 2.2 Tạo `packages/config/tsconfig/base.json` (strict, ES2022, verbatimModuleSyntax, noUncheckedIndexedAccess)
- [x] 2.3 Tạo `packages/config/tsconfig/react.json` extends base + JSX + DOM lib
- [x] 2.4 Tạo `packages/config/tsconfig/nestjs.json` extends base + decorators + commonjs
- [x] 2.5 Tạo `packages/config/eslint/base.js` (flat config, @typescript-eslint, import order)
- [x] 2.6 Tạo `packages/config/eslint/react.js` extends base + react + react-hooks + jsx-a11y
- [x] 2.7 Tạo `packages/config/eslint/nestjs.js` extends base + node + nest-specific rules
- [x] 2.8 Tạo `packages/config/prettier/index.js` (singleQuote, trailingComma all, printWidth 100)
- [x] 2.9 Verify package resolve được từ workspace (test import từ một app stub)

## 3. Shared Types Package (packages/shared-types)

- [x] 3.1 Tạo `packages/shared-types/package.json` với name `@bookee/shared-types`, private, main `dist/index.js`, types `dist/index.d.ts`
- [x] 3.2 Tạo `packages/shared-types/tsconfig.json` extends base
- [x] 3.3 Tạo `packages/shared-types/src/index.ts` placeholder export type (Prisma re-export sẽ thêm sau khi Prisma init)
- [x] 3.4 Thêm script `build` (`tsc`) và `db:generate` (no-op placeholder, sẽ wire vào Prisma sau)

## 4. NestJS API App (apps/api)

- [x] 4.1 Tạo `apps/api/package.json` với name `@bookee/api`, deps: @nestjs/{common,core,platform-express}, reflect-metadata, rxjs
- [x] 4.2 DevDeps: @nestjs/cli, @nestjs/testing, @swc/cli, @swc/core, typescript, jest, ts-jest, @types/node, @types/jest
- [x] 4.3 Tạo `apps/api/.swcrc` (typescript syntax, legacyDecorator true, decoratorMetadata true, target es2022, module commonjs)
- [x] 4.4 Tạo `apps/api/nest-cli.json` với `"builder": "swc"`, `"typeCheck": true`
- [x] 4.5 Tạo `apps/api/tsconfig.json` extends `@bookee/config/tsconfig/nestjs.json`
- [x] 4.6 Tạo `apps/api/tsconfig.build.json` (exclude test files)
- [x] 4.7 Tạo `apps/api/eslint.config.js` import `@bookee/config/eslint/nestjs`
- [x] 4.8 Tạo `apps/api/src/main.ts` bootstrap NestJS, listen PORT 3000
- [x] 4.9 Tạo `apps/api/src/app.module.ts` import HealthModule
- [x] 4.10 Tạo `apps/api/src/health/health.controller.ts` với `GET /health` trả `{ status: 'ok' }`
- [x] 4.11 Tạo `apps/api/src/health/health.module.ts`
- [x] 4.12 Thêm scripts: `dev` (`nest start --builder swc --watch`), `build` (`nest build --builder swc`), `start:prod` (`bun dist/main.js`), `lint`, `typecheck` (`tsc --noEmit`), `test` (`jest`)
- [x] 4.13 Test `bun run dev` chạy được, `curl localhost:3000/health` trả 200

## 5. Prisma Setup (in apps/api)

- [ ] 5.1 Cài `prisma` (dev) + `@prisma/client` (prod) trong `apps/api`
- [ ] 5.2 Chạy `bunx prisma init` → tạo `apps/api/prisma/schema.prisma`
- [ ] 5.3 Cấu hình schema datasource = postgresql (URL từ env), generator client default location
- [ ] 5.4 Thêm script `db:generate` (`prisma generate`) vào `apps/api/package.json`
- [ ] 5.5 Cập nhật `apps/api/package.json` postinstall = `prisma generate` để autoregen sau bun install
- [ ] 5.6 Wire `packages/shared-types/src/index.ts` re-export type Prisma (ban đầu để trống vì schema chưa có model)

## 6. Operator CMS App (apps/operator-cms)

- [x] 6.1 Tạo `apps/operator-cms` với Vite React-TS template (manual hoặc `bunx create-vite`)
- [x] 6.2 Đổi name trong package.json → `@bookee/operator-cms`
- [x] 6.3 Cài deps: react, react-dom, react-router-dom@6, @tanstack/react-query@5
- [x] 6.4 DevDeps: @tanstack/react-query-devtools, @types/react, @types/react-dom, vite, @vitejs/plugin-react-swc, typescript
- [x] 6.5 Tạo `tsconfig.json` extends `@bookee/config/tsconfig/react.json`
- [x] 6.6 Tạo `eslint.config.js` import `@bookee/config/eslint/react`
- [x] 6.7 Cấu hình Vite port 5173 trong `vite.config.ts`
- [x] 6.8 Tạo `src/lib/query-client.ts` export configured QueryClient
- [x] 6.9 Tạo `src/router.tsx` với `createBrowserRouter` + placeholder route `/`
- [x] 6.10 Tạo `src/main.tsx` wrap `<QueryClientProvider>` + `<RouterProvider>`, dynamic import devtools khi `import.meta.env.DEV`
- [x] 6.11 Tạo `src/pages/landing.tsx` hiển thị "Operator CMS"
- [x] 6.12 Thêm scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`
- [x] 6.13 Test `bun run dev` mở `http://localhost:5173` thấy trang

## 7. User Web App (apps/user-web)

- [x] 7.1 Tạo `apps/user-web` (cấu trúc giống operator-cms)
- [x] 7.2 Đổi name → `@bookee/user-web`, port Vite = 5174
- [x] 7.3 Cài deps tương tự operator-cms
- [x] 7.4 Tạo tsconfig + eslint config kế thừa shared preset
- [x] 7.5 Tạo `src/lib/query-client.ts`, `src/router.tsx`, `src/main.tsx` analog operator-cms
- [x] 7.6 Tạo `src/pages/landing.tsx` hiển thị "Bookee"
- [x] 7.7 Test `bun run dev` mở `http://localhost:5174` thấy trang

## 8. Husky + lint-staged

- [x] 8.1 Cài Husky v9 + lint-staged ở root
- [x] 8.2 Chạy `bunx husky init` tạo `.husky/`
- [x] 8.3 Thêm `.husky/pre-commit` chạy `bunx lint-staged`
- [x] 8.4 Thêm `lint-staged` config trong root package.json: `*.{ts,tsx,js,jsx}` → `eslint --fix`, `prettier --write`
- [x] 8.5 Test commit thử file có lint warning, verify auto-fix

## 9. End-to-end Verification

- [ ] 9.1 Xoá node_modules + bun.lock, chạy `bun install` ở root từ đầu — verify pass clean
- [x] 9.2 Chạy `bun run typecheck` từ root — toàn workspace pass
- [x] 9.3 Chạy `bun run lint` từ root — pass (cảnh báo OK, error fail)
- [x] 9.4 Chạy `bun run build` từ root — sinh dist cho api, build cho 2 FE
- [ ] 9.5 Chạy `bun run dev` từ root — 3 service chạy song song, log có prefix
- [x] 9.6 Curl `http://localhost:3000/health` trả `{ "status": "ok" }`
- [ ] 9.7 Mở browser xem `:5173` và `:5174` thấy placeholder
- [x] 9.8 Verify Turborepo cache: chạy build lần 2, log hiện "FULL TURBO" hoặc cache HIT
- [ ] 9.9 Test git commit để verify Husky pre-commit hook fire

## 10. Documentation

- [x] 10.1 Cập nhật README root: prerequisites (Bun 1.1+), install, dev, build, structure overview
- [x] 10.2 Note về NestJS + SWC + Bun combo, troubleshooting common issues
- [x] 10.3 Lưu sơ đồ workspace deps (apps → packages) trong README
