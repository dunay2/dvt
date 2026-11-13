/**
 * Owned concern: Prove production reachability independently of type-only, unused and fake imports.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  API_REACHABILITY_CLASSIFICATIONS,
  REQUIRED_API_DEPLOYMENT_PROFILES,
  classifyApiSourceReachability,
  collectApiReachabilityFindings,
} from '../check-architecture-dependencies.mjs';

test('reachability classifies production, dynamic, test-support and orphan modules once', () => {
  const modules = [
    {
      source: 'apps/api/src/app.ts',
      dependencies: [
        { resolved: 'apps/api/src/production.ts', dynamic: false },
        { resolved: 'apps/api/src/conditional.ts', dynamic: true },
      ],
    },
    { source: 'apps/api/src/server.ts', dependencies: [] },
    { source: 'apps/api/src/production.ts', dependencies: [] },
    { source: 'apps/api/src/conditional.ts', dependencies: [] },
    { source: 'apps/api/src/testSupport.ts', dependencies: [] },
    { source: 'apps/api/src/orphan.ts', dependencies: [] },
    {
      source: 'apps/api/test/testSupport.test.ts',
      dependencies: [{ resolved: 'apps/api/src/testSupport.ts', dynamic: false }],
    },
  ];

  const result = classifyApiSourceReachability({
    modules,
    sourceFiles: [
      'apps/api/src/app.ts',
      'apps/api/src/server.ts',
      'apps/api/src/production.ts',
      'apps/api/src/conditional.ts',
      'apps/api/src/testSupport.ts',
      'apps/api/src/orphan.ts',
    ],
    productionRoots: ['apps/api/src/app.ts', 'apps/api/src/server.ts'],
    testRoots: ['apps/api/test/testSupport.test.ts'],
  });

  assert.deepEqual(
    result.classifications.map(({ source, classification }) => [source, classification]),
    [
      ['apps/api/src/app.ts', API_REACHABILITY_CLASSIFICATIONS.production],
      ['apps/api/src/conditional.ts', API_REACHABILITY_CLASSIFICATIONS.conditionalProduction],
      ['apps/api/src/orphan.ts', API_REACHABILITY_CLASSIFICATIONS.orphan],
      ['apps/api/src/production.ts', API_REACHABILITY_CLASSIFICATIONS.production],
      ['apps/api/src/server.ts', API_REACHABILITY_CLASSIFICATIONS.production],
      ['apps/api/src/testSupport.ts', API_REACHABILITY_CLASSIFICATIONS.testSupport],
    ]
  );
});

test('reachability rejects new test-only, orphan, production-to-test and fake import paths', () => {
  const classificationResult = classifyApiSourceReachability({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [
          { module: './fake.js', resolved: 'apps/api/src/fake.ts', dynamic: false },
          { module: '../test/support.js', resolved: 'apps/api/test/support.ts', dynamic: false },
        ],
      },
      { source: 'apps/api/src/server.ts', dependencies: [] },
      { source: 'apps/api/src/fake.ts', dependencies: [] },
      { source: 'apps/api/src/testOnly.ts', dependencies: [] },
      { source: 'apps/api/src/orphan.ts', dependencies: [] },
      { source: 'apps/api/test/support.ts', dependencies: [] },
      {
        source: 'apps/api/test/testOnly.test.ts',
        dependencies: [{ resolved: 'apps/api/src/testOnly.ts', dynamic: false }],
      },
    ],
    sourceFiles: [
      'apps/api/src/app.ts',
      'apps/api/src/server.ts',
      'apps/api/src/fake.ts',
      'apps/api/src/testOnly.ts',
      'apps/api/src/orphan.ts',
    ],
    productionRoots: ['apps/api/src/app.ts', 'apps/api/src/server.ts'],
    testRoots: ['apps/api/test/testOnly.test.ts', 'apps/api/test/support.ts'],
  });
  const findings = collectApiReachabilityFindings({
    ...classificationResult,
    modules: classificationResult.modules,
    changedSourceFiles: [
      'apps/api/src/fake.ts',
      'apps/api/src/testOnly.ts',
      'apps/api/src/orphan.ts',
    ],
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        "import './fake.js';\nimport value from '../test/support.js';\nvoid value;\n",
      ],
    ]),
    profileEvidence: REQUIRED_API_DEPLOYMENT_PROFILES.map((profile) => ({ profile })),
  });

  assert.deepEqual(
    new Set(findings.map(({ ruleName }) => ruleName)),
    new Set([
      'no-new-api-test-support-source',
      'no-new-api-orphan-source',
      'no-api-production-to-test-support',
      'no-api-fake-reachability-import',
    ])
  );
});

test('type-only and unused value imports do not establish production reachability', () => {
  const sourceContents = new Map([
    [
      'apps/api/src/app.ts',
      [
        "import type { TypeOnly } from './typeOnly.js';",
        "import { UsedType } from './usedType.js';",
        "import { unusedValue } from './unusedValue.js';",
        'export type ProductContract = UsedType;',
        'export const app = 1;',
      ].join('\n'),
    ],
    ['apps/api/src/server.ts', 'export const server = 1;\n'],
    ['apps/api/src/typeOnly.ts', 'export interface TypeOnly { readonly value: string }\n'],
    ['apps/api/src/usedType.ts', 'export interface UsedType { readonly id: string }\n'],
    ['apps/api/src/unusedValue.ts', 'export const unusedValue = 1;\n'],
  ]);
  const result = classifyApiSourceReachability({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [
          {
            module: './typeOnly.js',
            resolved: 'apps/api/src/typeOnly.ts',
            dependencyTypes: ['type-only', 'import'],
            dynamic: false,
          },
          {
            module: './usedType.js',
            resolved: 'apps/api/src/usedType.ts',
            dependencyTypes: ['type-only', 'import'],
            dynamic: false,
          },
          {
            module: './unusedValue.js',
            resolved: 'apps/api/src/unusedValue.ts',
            dependencyTypes: ['import'],
            dynamic: false,
          },
        ],
      },
      { source: 'apps/api/src/server.ts', dependencies: [] },
      { source: 'apps/api/src/typeOnly.ts', dependencies: [] },
      { source: 'apps/api/src/usedType.ts', dependencies: [] },
      { source: 'apps/api/src/unusedValue.ts', dependencies: [] },
    ],
    sourceFiles: [...sourceContents.keys()],
    productionRoots: ['apps/api/src/app.ts', 'apps/api/src/server.ts'],
    testRoots: [],
    sourceContents,
  });
  const bySource = new Map(
    result.classifications.map(({ source, classification }) => [source, classification])
  );

  assert.equal(bySource.get('apps/api/src/typeOnly.ts'), API_REACHABILITY_CLASSIFICATIONS.orphan);
  assert.deepEqual(
    result.classifications.find(({ source }) => source === 'apps/api/src/usedType.ts'),
    {
      source: 'apps/api/src/usedType.ts',
      classification: API_REACHABILITY_CLASSIFICATIONS.production,
      runtimeReachability: 'none',
      retentionReason: 'production-type-support',
    }
  );
  assert.equal(
    bySource.get('apps/api/src/unusedValue.ts'),
    API_REACHABILITY_CLASSIFICATIONS.orphan
  );

  const findings = collectApiReachabilityFindings({
    ...result,
    changedSourceFiles: ['apps/api/src/typeOnly.ts', 'apps/api/src/unusedValue.ts'],
    sourceContents,
    profileEvidence: REQUIRED_API_DEPLOYMENT_PROFILES.map((profile) => ({ profile })),
  });
  assert.ok(findings.some(({ ruleName }) => ruleName === 'no-api-fake-reachability-import'));
});
