import globals from 'globals';

import base from './base.mjs';

/*
 * This is a custom ESLint configuration for use with Nest.js apps.
 */

export default [
  ...base,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'import-x/no-default-export': 'off',
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
    },
  },
];
