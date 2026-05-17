import nestConfig from '@bookee/config/eslint/nestjs';

export default [
  {
    ignores: [
      'scripts/**',
      'src/metadata.ts',
      'src/generated/**',
      'vitest.config.ts',
      'vitest.unit.config.ts',
      'vitest.integration.config.ts',
      'vitest.shared.ts',
      'prisma.config.ts',
      'prisma/seed.ts',
    ],
  },
  ...nestConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
