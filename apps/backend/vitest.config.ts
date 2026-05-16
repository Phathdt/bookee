import { resolve } from 'node:path';

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Vitest config for NestJS using SWC for decorator-aware transpile.
// Mirrors the .swcrc settings used by nest build.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{spec,test}.ts', 'test/**/*.{spec,test,e2e-spec}.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Integration specs share a Postgres testcontainer; run files serially
    // so their lifecycle hooks don't race.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        // Auto-generated / framework wiring / type-only files
        'src/generated/**',
        'src/main.ts',
        'src/metadata.ts',
        'src/swagger.ts',
        'src/**/*.dto.ts',
        'src/**/*.module.ts',
        'src/**/index.ts',
        'src/**/jwt-payload.ts',
        'src/**/interfaces/**',
        // Infrastructure wrappers around third-party libs — tested via smoke
        // specs but not held to the threshold.
        'src/modules/logger/**',
        'src/modules/database/**',
        // Decorators / 1-line guard subclasses — exercised only at Nest runtime
        'src/**/decorators/**',
        'src/**/guards/jwt-auth.guard.ts',
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
