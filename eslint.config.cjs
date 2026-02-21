// @ts-check
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
    files: ['packages/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}'],
    ignores: [
      'packages/frontend/**',
      'packages/@dvt/contracts/vitest.config.ts',
      'docs/**',
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'apps/web/dist/**',
      'apps/api/dist/**',
    ],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        // Single project graph via TS project references to avoid multiple-program ambiguity.
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
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
          project: ['./tsconfig.eslint.json'],
        },
        node: {
          extensions: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.d.ts', '.json'],
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
    },
  },

  // Project-specific parserOptions (kept) — optional, but harmless.
  {
    files: ['packages/@dvt/engine/src/**/*.ts', 'packages/@dvt/engine/vitest.config.ts'],
    languageOptions: {
      parserOptions: { project: ['packages/@dvt/engine/tsconfig.eslint.json'], tsconfigRootDir: __dirname },
    },
  },
  {
    files: ['packages/@dvt/engine/test/**/*.ts'],
    languageOptions: {
      parserOptions: { project: ['packages/@dvt/engine/tsconfig.test.eslint.json'], tsconfigRootDir: __dirname },
      globals: { TextEncoder: 'readonly', TextDecoder: 'readonly' },
    },
  },
  {
    files: ['packages/@dvt/adapter-temporal/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['packages/@dvt/adapter-temporal/tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['packages/@dvt/adapter-postgres/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['packages/@dvt/adapter-postgres/tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['apps/api/src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { project: ['apps/api/tsconfig.json'], tsconfigRootDir: __dirname },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { project: ['apps/web/tsconfig.json'], tsconfigRootDir: __dirname },
      globals: { window: 'readonly', document: 'readonly', navigator: 'readonly', React: 'readonly' },
    },
    rules: {
      // UI app: relajar reglas estrictas que generan miles de warnings/errores sin valor
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'import/order': 'off',
      'no-undef': 'off',
      'no-console': 'off',
      'no-case-declarations': 'off',
      // Algunas reglas base pueden ser ruidosas en prototipos UI
      'no-useless-assignment': 'off',
    },
  },
  {
    files: ['apps/web/vite.config.ts'],
    languageOptions: {
      parserOptions: { tsconfigRootDir: __dirname }, // no project => no type-aware for this file
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Determinism rules for engine source (packages/@dvt/engine/src/**)
  // Forbidden: Date.now(), new Date(), Math.random(), process.env
  // See: CLAUDE.md "Determinism Rules" and docs/architecture/engine/dev/determinism-tooling.md
  // ──────────────────────────────────────────────────────────────────────────
  {
    files: ['packages/@dvt/engine/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'new Date() is non-deterministic in engine code. Use the injected IClock interface.',
        },
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: 'process.env is forbidden in engine code. Pass configuration explicitly via dependency injection.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Date',
          property: 'now',
          message: 'Date.now() is non-deterministic in engine code. Use the injected IClock interface.',
        },
        {
          object: 'Math',
          property: 'random',
          message: 'Math.random() is non-deterministic. Use the injected RNG.',
        },
        {
          object: 'crypto',
          property: 'randomBytes',
          message: 'crypto.randomBytes() is non-deterministic. Use deterministic UUID generation.',
        },
      ],
    },
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Strictest determinism rules for Temporal workflow files
  // Workflows run inside the Temporal sandbox and MUST be fully deterministic.
  // All I/O, timers, and side effects must be delegated to activities.
  // See: https://docs.temporal.io/workflows#deterministic-constraints
  // ──────────────────────────────────────────────────────────────────────────
  {
    files: ['packages/@dvt/adapter-temporal/src/workflows/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'new Date() is non-deterministic in workflows. Use workflow SDK time utilities.',
        },
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: 'process.env is forbidden in workflows. Configuration must come from workflow arguments.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Date',
          property: 'now',
          message: 'Date.now() is non-deterministic in workflows. Use workflow SDK time utilities.',
        },
        {
          object: 'Math',
          property: 'random',
          message: 'Math.random() is non-deterministic in workflows. Use workflow SDK uuid4().',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'setTimeout',
          message: 'setTimeout is non-deterministic in workflows. Use workflow.sleep() instead.',
        },
        {
          name: 'setInterval',
          message: 'setInterval is not allowed in Temporal workflows.',
        },
        {
          name: 'setImmediate',
          message: 'setImmediate is not allowed in Temporal workflows.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'fs', message: 'File system access is forbidden in workflows. Delegate to activities.' },
            { name: 'fs/promises', message: 'File system access is forbidden in workflows. Delegate to activities.' },
            { name: 'http', message: 'Network access is forbidden in workflows. Delegate to activities.' },
            { name: 'https', message: 'Network access is forbidden in workflows. Delegate to activities.' },
            { name: 'net', message: 'Network access is forbidden in workflows. Delegate to activities.' },
            { name: 'child_process', message: 'Process spawning is forbidden in workflows. Delegate to activities.' },
          ],
        },
      ],
    },
  },

  // Test files configuration with Vitest
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts', '**/*.test.tsx', '**/*.spec.tsx'],
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
      'no-restricted-syntax': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-imports': 'off',
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
      'packages/@dvt/engine/legacy-top-level-engine/**',
      'packages/adapters-legacy/**',
      '**/*.d.ts',
      '.github/',
      '*.config.js',
      '*.config.ts',
      '*.config.cjs',
      'eslint.config.cjs',
      // keep vite config linted via a light config block below to avoid warnings
    ],
  },

  // Lightweight config for config files to suppress warnings
  {
    files: ['**/vite.config.ts', '**/vitest.config.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: { __dirname: 'readonly', require: 'readonly', module: 'readonly', process: 'readonly' },
    },
    rules: {
      'import/no-unresolved': 'off',
      'no-undef': 'off',
    },
  },
];
