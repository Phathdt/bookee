import globals from 'globals';

import base from './base.js';

export default [
  ...base,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      // Turn off entirely for backend: Nest decorator metadata + DI tokens
      // (abstract classes used as @Inject keys) are too easy to break with
      // either auto-fix direction. Developer decides per-import.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
