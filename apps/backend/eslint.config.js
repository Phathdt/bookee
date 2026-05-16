import nestConfig from '@bookee/config/eslint/nestjs';

export default [
  {
    ignores: ['scripts/**', 'src/metadata.ts'],
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
