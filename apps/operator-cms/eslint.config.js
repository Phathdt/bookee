import reactConfig from '@bookee/config/eslint/react';

export default [
  {
    ignores: ['vitest.config.ts'],
  },
  ...reactConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
