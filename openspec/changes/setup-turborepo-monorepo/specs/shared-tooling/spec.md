## ADDED Requirements

### Requirement: TypeScript strict baseline

Hệ thống SHALL có `packages/config/tsconfig/base.json` với `"strict": true`, `"noUncheckedIndexedAccess": true`, `"verbatimModuleSyntax": true`, `target: es2022`. Mọi app và package MUST extend trực tiếp hoặc gián tiếp từ base này.

#### Scenario: Strict mode catches implicit any
- **WHEN** developer viết function với param không khai báo type
- **THEN** `tsc --noEmit` báo lỗi TS7006 (implicit any)

#### Scenario: React preset extends base
- **WHEN** `apps/user-web/tsconfig.json` extend `@bookee/config/tsconfig/react.json`
- **THEN** config kế thừa strict + thêm `jsx: react-jsx`, `lib: ["DOM", "ES2022"]`

#### Scenario: NestJS preset enables decorators
- **WHEN** `apps/api/tsconfig.json` extend `@bookee/config/tsconfig/nestjs.json`
- **THEN** config có `emitDecoratorMetadata: true`, `experimentalDecorators: true`, `module: commonjs`

### Requirement: ESLint flat config presets

Hệ thống SHALL có ESLint v9 flat config preset tại `packages/config/eslint/` với 3 entry: `base.js`, `react.js`, `nestjs.js`. Mỗi app MUST có `eslint.config.js` import từ `@bookee/config/eslint`.

#### Scenario: Lint catches unused variable
- **WHEN** developer viết `const unused = 42` trong file ở `apps/api/src/`
- **THEN** `bun run lint` báo cảnh báo `@typescript-eslint/no-unused-vars`

#### Scenario: React preset includes React hooks rules
- **WHEN** developer dùng `useEffect` không trong functional component
- **THEN** lint báo lỗi `react-hooks/rules-of-hooks`

### Requirement: Prettier shared config

Hệ thống SHALL có Prettier config tại `packages/config/prettier/index.js` định nghĩa: `semi: true`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `tabWidth: 2`. Root `package.json` MUST tham chiếu config này qua `"prettier": "@bookee/config/prettier"`.

#### Scenario: Format applies consistent style
- **WHEN** developer chạy `bun run format` trên file có inconsistent quotes
- **THEN** Prettier rewrite về single quotes theo preset

### Requirement: Husky pre-commit hook

Hệ thống SHALL setup Husky v9 với pre-commit hook chạy `lint-staged`. `lint-staged` config MUST chạy `eslint --fix` + `prettier --write` chỉ trên file `.ts/.tsx/.js/.jsx` đã staged.

#### Scenario: Pre-commit fixes lint issues
- **WHEN** developer commit file `.ts` có lint warning fixable
- **THEN** Husky chạy lint-staged, ESLint auto-fix, stage lại file đã sửa và commit

#### Scenario: Pre-commit blocks unfixable error
- **WHEN** developer commit file có lỗi syntax không auto-fix được
- **THEN** Husky abort commit, in lỗi ESLint ra terminal

### Requirement: Editor and runtime version pinning

Hệ thống SHALL có `.editorconfig` ở root khai báo indent_size = 2, charset = utf-8, end_of_line = lf. SHALL có `.bun-version` pin Bun version cụ thể (≥ 1.1.x).

#### Scenario: Editor respects EditorConfig
- **WHEN** developer mở file trong VS Code (đã cài editorconfig plugin)
- **THEN** editor dùng 2 space indent, không trộn tab

#### Scenario: Bun version mismatch warning
- **WHEN** developer chạy bun với version khác với `.bun-version`
- **THEN** README hướng dẫn `bun upgrade --canary` hoặc dùng `proto`/`mise` để pin version

### Requirement: Git ignore baseline

Hệ thống SHALL có `.gitignore` ở root loại trừ: `node_modules/`, `dist/`, `build/`, `.turbo/`, `.env*` (trừ `.env.example`), `coverage/`, `*.log`, `.DS_Store`, `.vscode/` (trừ `extensions.json` và `settings.json`).

#### Scenario: node_modules not committed
- **WHEN** developer chạy `git status` sau `bun install`
- **THEN** `node_modules/` KHÔNG xuất hiện trong untracked files

#### Scenario: .env protected
- **WHEN** developer tạo `.env` ở bất kỳ app nào
- **THEN** `git status` KHÔNG show file đó là untracked
