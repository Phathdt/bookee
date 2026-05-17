import baseConfig from '@bookee/config/eslint/base';
import reactConfig from '@bookee/config/eslint/react';

// lint-staged runs eslint --fix from the repo root, so the root config must
// know about per-layer overrides — otherwise the base rules silently strip
// `import type` from FE files (breaks verbatimModuleSyntax) or apply the
// wrong direction to backend files.
export default [
  ...baseConfig,
  // FE preset: prefer type-imports (matches verbatimModuleSyntax).
  ...reactConfig.map((cfg) =>
    cfg.files
      ? { ...cfg, files: cfg.files.map((g) => `apps/{user-web,operator-cms}/**/${g}`) }
      : cfg,
  ),
  // Backend override: disable consistent-type-imports — Nest decorator
  // metadata + abstract-class DI tokens are too easy to break with either
  // auto-fix direction.
  {
    files: ['apps/backend/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
