import reactConfig from '@bookee/config/eslint/react';

export default [
  ...reactConfig,
  {
    ignores: ['src/generated/**', 'openapi.yaml'],
  },
];
