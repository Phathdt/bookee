import { defineConfig } from 'vitest/config';

import { sharedCoverage, sharedPlugins, sharedResolve } from './vitest.shared';

// Integration suite — repository (real Postgres via testcontainers) and
// controller (full Nest app + HTTP) specs. Runs serially across files so
// the shared container's lifecycle hooks don't race.
export default defineConfig({
  resolve: sharedResolve,
  plugins: sharedPlugins,
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.spec.ts'],
    exclude: ['**/node_modules/**'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    coverage: sharedCoverage,
  },
});
