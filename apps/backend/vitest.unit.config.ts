import { defineConfig } from 'vitest/config';

import { sharedCoverage, sharedPlugins, sharedResolve } from './vitest.shared';

// Fast unit suite — pure service / utility / function tests with mocked
// repositories. No DB, no Nest app boot.
export default defineConfig({
  resolve: sharedResolve,
  plugins: sharedPlugins,
  test: {
    name: 'unit',
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/*.integration.spec.ts'],
    testTimeout: 10_000,
    coverage: sharedCoverage,
  },
});
