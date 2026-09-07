import globals from 'globals';

import base from './base.mjs';

/*
 * This is a custom ESLint configuration for use with TypeScript packages.
 */

export default [
  ...base,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
];
