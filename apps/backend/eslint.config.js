import nestConfig from '@bookee/config/eslint/nestjs';

export default [
  {
    ignores: [
      'scripts/**',
      'src/metadata.ts',
      'src/generated/**',
      'vitest.config.ts',
      'prisma.config.ts',
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
  {
    // DTO classes are referenced at runtime via NestJS @Body decorator
    // metadata (emitDecoratorMetadata). The consistent-type-imports rule
    // mistakenly treats them as type-only, breaking validation. Disable
    // the rule inside controller files so DTO imports stay runtime.
    files: ['src/controllers/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
