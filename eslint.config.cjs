// @ts-check
const { fixupPluginRules } = require('@eslint/compat');
const eslint = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const importPlugin = require('eslint-plugin-import');
const prettier = require('eslint-config-prettier');

const deliveryOwnedContractImports = [
  'IOutboxStorage',
  'IEventBus',
  'OutboxWorkerObserver',
  'OutboxTickResult',
  'OutboxClaimSelection',
  'OutboxFailureDisposition',
  'MAX_OUTBOX_ATTEMPTS',
];

const traceabilityOwnedContractImports = [
  'ILineageSink',
  'ILineageOutboxStore',
  'LineagePublishPayload',
  'LineageFailureDisposition',
  'LineageOutboxRecord',
  'LineageDeadLetterRecord',
  'MAX_LINEAGE_ATTEMPTS',
];

const retiredArtifactContractImports = [
  'validateArtifactIntegrity',
  'IArtifactStore',
  'IArtifactReader',
  'IArtifactWriter',
];

const plannerOwnedContractImports = [
  'IPlanExecutabilityValidator',
  'IExecutionBindingVerifier',
  'IPlanValidationLifecycleStore',
  'ICustomPolicyNamespaceRegistry',
];

module.exports = [
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Global language options for all TypeScript files
  {
    files: ['packages/**/*.{ts,tsx}', 'apps/**/*.{ts,tsx}'],
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
        // Use a dedicated ESLint TSConfig that includes src/test entrypoints.
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
      import: fixupPluginRules(importPlugin),
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

  // Keep strict web lint type-aware without constructing the whole monorepo
  // TypeScript program. Pre-push and CI still execute the canonical rules;
  // only the owning project used to supply type information is narrowed.
  {
    files: ['apps/web/**/*.{ts,tsx}', 'apps/web/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./apps/web/tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
    },
  },

  // Contracts package: escalate no-explicit-any to error (enforcement replaces bash grep in CI).
  {
    files: ['packages/@dvt/contracts/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // Project-specific parserOptions (kept) — optional, but harmless.
  {
    files: ['packages/@dvt/engine/src/**/*.ts', 'packages/@dvt/engine/vitest.config.ts'],
    languageOptions: {
      parserOptions: { tsconfigRootDir: __dirname },
    },
  },
  {
    files: ['packages/@dvt/engine/test/**/*.ts'],
    languageOptions: {
      parserOptions: { tsconfigRootDir: __dirname },
      globals: { TextEncoder: 'readonly', TextDecoder: 'readonly' },
    },
  },
  {
    files: ['packages/@dvt/adapter-temporal/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['packages/@dvt/adapter-postgres/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['packages/@dvt/adapter-temporal/**/*.ts', 'packages/@dvt/adapter-postgres/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@dvt/contracts',
              importNames: [
                'IProviderAdapter',
                'IRunStateStore',
                'IRunStateStoreWrite',
                'IRunStateStoreRead',
                'IRunStateStoreMaintenance',
                'IStartRunIntentStore',
                'IRunSnapshotStalenessQuery',
                'IProjector',
                'StartRunIntentPolicy',
                'RunStateCommandPort',
                'IClock',
                'IIdempotencyKeyBuilder',
                'IPlanFetcher',
                'IPlanIntegrityValidator',
              ],
              message:
                'Engine-owned behavioral ports MUST be imported from @dvt/engine, not @dvt/contracts (ADR-0018).',
            },
            {
              name: '@dvt/contracts',
              importNames: deliveryOwnedContractImports,
              message:
                'Delivery-owned behavioral ports MUST be imported from @dvt/delivery, not @dvt/contracts (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: traceabilityOwnedContractImports,
              message:
                'Traceability-owned lineage contracts MUST be imported from @dvt/traceability-service, not @dvt/contracts (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: retiredArtifactContractImports,
              message:
                'Artifact integrity helpers and generic artifact-store ports no longer live in @dvt/contracts; use @dvt/artifacts owner-local seams (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: plannerOwnedContractImports,
              message:
                'Planner-owned behavior ports MUST be imported from @dvt/planner, not @dvt/contracts (RC-G1-D).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/@dvt/adapter-temporal/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@dvt/planner', '@dvt/planner/*'],
              message:
                'Engine adapters MUST NOT import @dvt/planner. Planner sovereignty is mandatory (ADR-001).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { tsconfigRootDir: __dirname },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['apps/lineage-worker/src/bootstrap.ts'],
    rules: {
      'import/order': 'off',
    },
  },
  {
    files: [
      'packages/@dvt/delivery/**/*.ts',
      'packages/@dvt/traceability-service/**/*.ts',
      'apps/outbox-worker/**/*.{ts,tsx}',
      'apps/lineage-worker/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@dvt/contracts',
              importNames: deliveryOwnedContractImports,
              message:
                'Delivery-owned behavioral ports MUST be imported from @dvt/delivery, not @dvt/contracts (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: traceabilityOwnedContractImports,
              message:
                'Traceability-owned lineage contracts MUST be imported from @dvt/traceability-service, not @dvt/contracts (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: retiredArtifactContractImports,
              message:
                'Artifact integrity helpers and generic artifact-store ports no longer live in @dvt/contracts; use @dvt/artifacts owner-local seams (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: plannerOwnedContractImports,
              message:
                'Planner-owned behavior ports MUST be imported from @dvt/planner, not @dvt/contracts (RC-G1-D).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { tsconfigRootDir: __dirname },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        React: 'readonly',
      },
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
    files: ['apps/web/cypress/**/*.ts', 'apps/web/cypress.config.ts'],
    languageOptions: {
      parserOptions: { tsconfigRootDir: __dirname },
      globals: {
        Cypress: 'readonly',
        cy: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      'no-undef': 'off',
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
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@dvt/contracts',
              importNames: [
                'IProviderAdapter',
                'IRunStateStore',
                'IRunStateStoreWrite',
                'IRunStateStoreRead',
                'IRunStateStoreMaintenance',
                'IStartRunIntentStore',
                'IRunSnapshotStalenessQuery',
                'IProjector',
                'StartRunIntentPolicy',
                'RunStateCommandPort',
                'IClock',
                'IIdempotencyKeyBuilder',
                'IPlanFetcher',
                'IPlanIntegrityValidator',
              ],
              message:
                'Engine-owned behavioral ports MUST be imported from @dvt/engine, not @dvt/contracts (ADR-0018).',
            },
            {
              name: '@dvt/contracts',
              importNames: deliveryOwnedContractImports,
              message:
                'Delivery-owned behavioral ports MUST be imported from @dvt/delivery, not @dvt/contracts (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: traceabilityOwnedContractImports,
              message:
                'Traceability-owned lineage contracts MUST be imported from @dvt/traceability-service, not @dvt/contracts (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: retiredArtifactContractImports,
              message:
                'Artifact integrity helpers and generic artifact-store ports no longer live in @dvt/contracts; use @dvt/artifacts owner-local seams (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: plannerOwnedContractImports,
              message:
                'Planner-owned behavior ports MUST be imported from @dvt/planner, not @dvt/contracts (RC-G1-D).',
            },
          ],
          patterns: [
            {
              group: ['@dvt/planner', '@dvt/planner/*'],
              message:
                '@dvt/engine source MUST NOT import @dvt/planner. Planner consumption belongs in composition roots and planner-owned boundaries.',
            },
            {
              group: ['@dvt/adapter-temporal', '@dvt/adapter-temporal/*'],
              message:
                '@dvt/engine source MUST NOT import concrete provider adapters. Depend on IProviderAdapter and wire adapters only in composition roots.',
            },
            {
              group: ['../**/planner/**', '../**/adapter-temporal/**'],
              message:
                '@dvt/engine source MUST NOT reach planner or concrete adapter internals by relative path.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message:
            'new Date() is non-deterministic in engine code. Use the injected IClock interface.',
        },
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            'process.env is forbidden in engine code. Pass configuration explicitly via dependency injection.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Date',
          property: 'now',
          message:
            'Date.now() is non-deterministic in engine code. Use the injected IClock interface.',
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

  // Tripwire A1: branded casts are transitional and MUST NOT live in engine core.
  {
    files: ['packages/@dvt/engine/src/core/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSAsExpression[typeAnnotation.typeName.name='RunId']",
          message:
            '`as RunId` is forbidden in engine/src/core. Move branding casts to API/adapter boundaries.',
        },
        {
          selector: "TSAsExpression[typeAnnotation.typeName.name='TenantId']",
          message:
            '`as TenantId` is forbidden in engine/src/core. Move branding casts to API/adapter boundaries.',
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
          message:
            'process.env is forbidden in workflows. Configuration must come from workflow arguments.',
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
            {
              name: 'fs',
              message: 'File system access is forbidden in workflows. Delegate to activities.',
            },
            {
              name: 'fs/promises',
              message: 'File system access is forbidden in workflows. Delegate to activities.',
            },
            {
              name: 'http',
              message: 'Network access is forbidden in workflows. Delegate to activities.',
            },
            {
              name: 'https',
              message: 'Network access is forbidden in workflows. Delegate to activities.',
            },
            {
              name: 'net',
              message: 'Network access is forbidden in workflows. Delegate to activities.',
            },
            {
              name: 'child_process',
              message: 'Process spawning is forbidden in workflows. Delegate to activities.',
            },
          ],
        },
      ],
    },
  },

  // Test files configuration with Vitest
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/test/**/*.ts', '**/*.test.tsx', '**/*.spec.tsx'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsparser,
      parserOptions: {},
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
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-imports': 'off',
    },
  },

  {
    files: [
      'packages/@dvt/adapter-temporal/test/**/*.ts',
      'packages/@dvt/adapter-postgres/test/**/*.ts',
      'packages/@dvt/state-store/**/*.ts',
      'apps/api/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@dvt/contracts',
              importNames: [
                'IProviderAdapter',
                'IRunStateStore',
                'IRunStateStoreWrite',
                'IRunStateStoreRead',
                'IRunStateStoreMaintenance',
                'IStartRunIntentStore',
                'IRunSnapshotStalenessQuery',
                'IProjector',
                'StartRunIntentPolicy',
                'RunStateCommandPort',
                'IClock',
                'IIdempotencyKeyBuilder',
                'IPlanFetcher',
                'IPlanIntegrityValidator',
              ],
              message:
                'Engine-owned behavioral ports MUST be imported from @dvt/engine, not @dvt/contracts (ADR-0018).',
            },
            {
              name: '@dvt/contracts',
              importNames: deliveryOwnedContractImports,
              message:
                'Delivery-owned behavioral ports MUST be imported from @dvt/delivery, not @dvt/contracts (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: traceabilityOwnedContractImports,
              message:
                'Traceability-owned lineage contracts MUST be imported from @dvt/traceability-service, not @dvt/contracts (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: retiredArtifactContractImports,
              message:
                'Artifact integrity helpers and generic artifact-store ports no longer live in @dvt/contracts; use @dvt/artifacts owner-local seams (RC-G1-C).',
            },
            {
              name: '@dvt/contracts',
              importNames: plannerOwnedContractImports,
              message:
                'Planner-owned behavior ports MUST be imported from @dvt/planner, not @dvt/contracts (RC-G1-D).',
            },
          ],
        },
      ],
    },
  },

  // Prettier should be last to override formatting rules
  prettier,

  // Node.js files (scripts, cjs, etc) should be linted with Node globals enabled
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },

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
      globals: {
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'import/no-unresolved': 'off',
      'no-undef': 'off',
    },
  },
];
