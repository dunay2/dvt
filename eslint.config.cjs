// ESLint configuration file with ignores migrated from .eslintignore
// See: https://eslint.org/docs/latest/use/configure/migration-guide#ignoring-files

/** @type {import('eslint').Linter.Config} */
module.exports = {
  ignores: [
    '**/*.test.ts',
    '**/*.spec.ts',
    'engine/test/**',
    'dist/',
    'node_modules/',
    'packages/engine/legacy-top-level-engine/**',
    'packages/adapters-legacy/**',
    '*.d.ts',
  ],
  // ...existing config (add your rules, plugins, etc. here)
}; // @ts-check
const eslint = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const importPlugin = require('eslint-plugin-import');
const vitestPlugin = require('eslint-plugin-vitest');
const prettier = require('eslint-config-prettier');

module.exports = [
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Global language options for all TypeScript files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        NodeJS: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      // Determinism-critical rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // Code quality
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      'no-unused-vars': 'off', // Turn off base rule as it doesn't support TypeScript syntax
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          args: 'none', // Don't check arguments at all (allows named params in interfaces)
          ignoreRestSiblings: true,
          caughtErrors: 'none', // Don't check caught errors
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Import organization
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-unresolved': 'error',
      'import/no-cycle': 'error',

      // Temporal workflow rules (for engine code)
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message: 'Use workflow.now() in Temporal workflows for determinism',
        },
        {
          name: 'Math.random',
          message: 'Use workflow-seeded RNG for determinism',
        },
        {
          name: 'setTimeout',
          message: 'Use workflow.sleep() in Temporal workflows',
        },
        {
          name: 'setInterval',
          message: 'Not allowed in Temporal workflows (non-deterministic)',
        },
      ],
    },
  },

  // Stricter rules for core engine and adapters
  {
    files: ['engine/core/**/*.ts', 'engine/adapters/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message: 'Use workflow.now() in Temporal workflows for determinism',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use workflow-seeded RNG for determinism',
        },
        {
          object: 'crypto',
          property: 'randomBytes',
          message: 'Use deterministic UUID generation',
        },
      ],
    },
  },

  // Test files configuration with Vitest
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts'],
    plugins: {
      vitest: vitestPlugin,
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.test.json',
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        vitest: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-globals': 'off',
    },
  },

  // Añadir overrides para TSConfig por carpeta
  {
    files: ['packages/engine/src/**/*.ts', 'packages/engine/vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        project: ['packages/engine/tsconfig.eslint.json'],
      },
    },
  },
  {
    files: ['packages/engine/test/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['packages/engine/tsconfig.test.eslint.json'],
      },
    },
  },

  // Prettier should be last to override formatting rules
  prettier,

  // Ignore patterns
  {
    ignores: [
      'dist/',
      'coverage/',
      'node_modules/',
      'packages/engine/legacy-top-level-engine/**',
      'packages/adapters-legacy/**',
      '**/*.d.ts',
      '.github/',
      'docs/',
      '*.config.js',
      '*.config.ts',
    ],
  },
];
