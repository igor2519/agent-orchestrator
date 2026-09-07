import nextPlugin from '@next/eslint-plugin-next';
import queryPlugin from '@tanstack/eslint-plugin-query';
import turboConfig from 'eslint-config-turbo/flat';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

import base from './base.mjs';

/*
 * This is a custom ESLint configuration for use with Next.js apps.
 */

export default [
  ...base,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  jsxA11y.flatConfigs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  ...queryPlugin.configs['flat/recommended'],
  ...turboConfig,
  {
    plugins: {
      '@next/next': nextPlugin,
      unicorn,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    settings: {
      react: { version: '19.2' },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'import-x/no-default-export': 'off',
      'turbo/no-undeclared-env-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@tanstack/query/stable-query-client': 'error',
      'react/hook-use-state': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          // react components should be in PascalCase
          // and react hooks should be in camelCase
          ignore: ['^use.+\\.ts$', '^.+\\.tsx$'],
          // unicorn 74 started checking directory names too; component folders
          // in this project are intentionally PascalCase
          checkDirectories: false,
        },
      ],
    },
  },
  {
    ignores: ['.next/'],
  },
];
