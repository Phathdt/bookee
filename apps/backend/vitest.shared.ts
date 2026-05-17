import { resolve } from 'node:path';

import swc from 'unplugin-swc';

// Shared Vitest building blocks used by both unit + integration configs.
// Mirrors .swcrc so transpile is decorator-aware everywhere.

export const sharedResolve = {
  alias: {
    '@': resolve(__dirname, './src'),
  },
};

export const sharedPlugins = [
  swc.vite({
    module: { type: 'es6' },
  }),
];

export const sharedCoverage = {
  provider: 'v8' as const,
  reporter: ['text', 'lcov'] as const,
  include: ['src/**/*.ts'],
  exclude: [
    'src/generated/**',
    'src/main.ts',
    'src/metadata.ts',
    'src/swagger.ts',
    'src/**/*.dto.ts',
    'src/**/*.module.ts',
    'src/**/index.ts',
    'src/**/jwt-payload.ts',
    'src/**/interfaces/**',
    // Infrastructure wrappers — tested via smoke / integration only.
    'src/modules/logger/**',
    'src/modules/database/**',
    // Trivial Nest pieces (decorators / 1-line guard subclasses).
    'src/**/decorators/**',
    'src/**/guards/jwt-auth.guard.ts',
  ],
};
