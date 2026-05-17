import { defineConfig } from 'vitest/config';

// Aggregates unit + integration as vitest projects — they share one cold
// start and run in parallel (each project gets its own worker pool),
// replacing the old `test:unit && test:integration` sequence.
export default defineConfig({
  test: {
    projects: ['./vitest.unit.config.ts', './vitest.integration.config.ts'],
  },
});
