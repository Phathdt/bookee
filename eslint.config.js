import baseConfig from '@bookee/config/eslint/base';
import reactConfig from '@bookee/config/eslint/react';

// lint-staged runs eslint --fix from the repo root, so the root config must
// know about the FE preset too — otherwise the base `no-type-imports` rule
// strips `import type` from React files and breaks verbatimModuleSyntax.
export default [
  ...baseConfig,
  ...reactConfig.map((cfg) =>
    cfg.files
      ? { ...cfg, files: cfg.files.map((g) => `apps/{user-web,operator-cms}/**/${g}`) }
      : cfg,
  ),
];
