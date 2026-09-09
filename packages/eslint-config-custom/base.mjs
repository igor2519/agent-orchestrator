import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import prettierPlugin from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

/*
 * This is a base ESLint configuration.
 * All packages should extend it.
 *
 * Flat config (ESLint 9+). Consumers spread it into their `eslint.config.mjs`.
 */

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

/*
 * Every workspace tsconfig, as explicit absolute paths. The mappings that
 * resolve `src/...` imports live in each package's own tsconfig, so a resolver
 * anchored on `process.cwd()` only sees them when ESLint runs from inside that
 * package; editors run it from the repo root and reported every aliased import
 * as unresolvable. Globs cannot be used here because the resolver expands them
 * relative to the working directory and drops that directory's own match.
 */
const workspaceProjects = ['apps', 'packages'].flatMap((group) =>
  readdirSync(resolve(repoRoot, group), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(repoRoot, group, entry.name, 'tsconfig.json'))
    .filter((tsconfig) => existsSync(tsconfig)),
);

/** Rules shared by every package in the monorepo. */
export const sharedRules = {
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  // ESLint 9 started reporting unused caught errors; keep the conventional
  // underscore escape hatch for deliberately unused bindings
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrors: 'none',
      ignoreRestSiblings: true,
    },
  ],
  'prettier/prettier': [
    'error',
    {
      endOfLine: 'auto',
      semi: true,
    },
  ],
  'import-x/no-unresolved': 'error',
  'import-x/named': 'error',
  'import-x/namespace': 'error',
  'import-x/default': 'error',
  'import-x/export': 'error',
  'import-x/no-extraneous-dependencies': ['error', { devDependencies: true }],
  'import-x/order': [
    1,
    {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
      pathGroups: [
        {
          pattern: '@/**',
          group: 'external',
          position: 'after',
        },
      ],
      pathGroupsExcludedImportTypes: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
        'object',
        'type',
      ],
    },
  ],
};

/** Files that are never linted, in any package. */
export const sharedIgnores = {
  ignores: ['node_modules/', 'dist/', 'coverage/', '**/*.d.ts'],
};

/**
 * Type-aware linting needs a TypeScript program. `projectService` resolves the
 * nearest tsconfig.json for each linted file, replacing the explicit
 * `parserOptions.project` path used under the old eslintrc config.
 */
export const typeCheckedLanguageOptions = {
  parserOptions: {
    projectService: true,
    tsconfigRootDir: process.cwd(),
  },
};

const base = [
  sharedIgnores,
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  prettierConfig,
  {
    plugins: { prettier: prettierPlugin },
    languageOptions: typeCheckedLanguageOptions,
    settings: {
      // exclude parent node_modules from the import/named rule in a monorepo
      'import-x/ignore': ['node_modules', '../../node_modules'],
      // eslint-plugin-import-x v4 resolver interface
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          // tried nearest-first for each linted file
          project: workspaceProjects,
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
        }),
      ],
    },
    rules: sharedRules,
  },
  {
    // config files and other plain JS are not part of any TS program
    ...tseslint.configs.disableTypeChecked,
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      // CommonJS config files legitimately use require()
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];

export default base;
