import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Vitest config for NestJS using SWC for decorator-aware transpile.
// Mirrors the .swcrc settings used by nest build.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{spec,test}.ts', 'test/**/*.{spec,test,e2e-spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.dto.ts', 'src/main.ts', 'src/metadata.ts'],
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
