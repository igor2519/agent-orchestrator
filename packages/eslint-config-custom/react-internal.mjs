import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

import base from './base.mjs';

/*
 * This is a custom ESLint configuration for use with internal
 * (bundled by their consumer) libraries that utilize React.
 */

export default [
  ...base,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  jsxA11y.flatConfigs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        JSX: 'readonly',
      },
    },
    settings: {
      react: { version: '19.2' },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];
