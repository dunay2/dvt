import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import ts from 'typescript';

import {
  API_REACHABILITY_CLASSIFICATIONS,
  REQUIRED_API_DEPLOYMENT_PROFILES,
  classifyApiSourceReachability,
  collectAdapterCanonicalContractFindings,
  collectApiDeploymentProfileEvidence,
  collectApiExportReachabilityEvidence,
  collectApiReachabilityFindings,
  collectApiProductionReachability,
  formatApiReachabilityReport,
  listFilesRecursive,
} from './check-architecture-dependencies.mjs';
import verifyPrepush from '../../scripts/verify-prepush.cjs';

const DEPCRUISE_CONFIG = resolve('.dependency-cruiser.cjs');
const REQUIRED_ARCH_DEPENDENCY_RULES = [
  'no-contracts-to-dvt-runtime',
  'no-planner-to-engine-or-adapters',
  'no-engine-to-concrete-adapters',
  'no-adapters-to-contract-internals',
  'no-web-to-backend-adapters',
  'no-presentation-to-infrastructure',
  'no-domain-to-framework-or-infrastructure',
  'no-dvt-package-cycles',
  'no-cross-package-deep-imports',
  'no-runtime-packages-to-scripts-or-tools',
  'no-api-domain-to-application',
  'no-api-application-to-fastify-or-jwt',
  'no-api-application-to-oidc-libs',
  'no-api-ports-to-http-types',
  'no-api-production-to-test-support',
];
const REQUIRED_SEMANTIC_ARCHITECTURE_RULES = ['no-adapters-own-canonical-contracts'];
const REQUIRED_ARCH_DEPENDENCY_COMMANDS = ['pnpm arch:deps'];
const DEPCRUISE_BIN = resolve('node_modules/dependency-cruiser/bin/dependency-cruise.mjs');

const DEPENDENCY_RULE_FIXTURES = [
  {
    ruleName: 'no-contracts-to-dvt-runtime',
    files: {
      'packages/@dvt/contracts/src/index.ts':
        "import runtime from '../../engine/src/index.js'; export default runtime;\n",
      'packages/@dvt/engine/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-planner-to-engine-or-adapters',
    files: {
      'packages/@dvt/planner/src/index.ts':
        "import runtime from '../../engine/src/index.js'; export default runtime;\n",
      'packages/@dvt/engine/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-engine-to-concrete-adapters',
    files: {
      'packages/@dvt/engine/src/index.ts':
        "import adapter from '../../adapter-postgres/src/index.js'; export default adapter;\n",
      'packages/@dvt/adapter-postgres/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-adapters-to-contract-internals',
    files: {
      'packages/@dvt/adapter-postgres/src/index.ts':
        "import internalContract from '../../contracts/src/internal.js'; export default internalContract;\n",
      'packages/@dvt/contracts/src/internal.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-web-to-backend-adapters',
    files: {
      'apps/web/src/index.ts':
        "import adapter from '../../../packages/@dvt/adapter-postgres/src/index.js'; export default adapter;\n",
      'packages/@dvt/adapter-postgres/src/index.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-presentation-to-infrastructure',
    files: {
      'apps/web/src/capability/presentation/view.ts':
        "import client from '../infrastructure/client.js'; export default client;\n",
      'apps/web/src/capability/infrastructure/client.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-domain-to-framework-or-infrastructure',
    files: {
      'apps/web/src/capability/domain/model.ts':
        "import { readFileSync } from 'node:fs'; export default readFileSync;\n",
    },
  },
  {
    ruleName: 'no-dvt-package-cycles',
    files: {
      'packages/@dvt/engine/src/a.ts': "import b from './b.js'; export default b;\n",
      'packages/@dvt/engine/src/b.ts': "import a from './a.js'; export default a;\n",
    },
  },
  {
    ruleName: 'no-cross-package-deep-imports',
    files: {
      'packages/@dvt/planner/src/index.ts':
        "import privateContract from '@dvt/contracts/src/contracts/private.js'; export default privateContract;\n",
      'packages/@dvt/contracts/src/contracts/private.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-cross-package-deep-imports',
    files: {
      'packages/@dvt/planner/src/index.ts':
        "import privateContract from '../../contracts/src/contracts/private.js'; export default privateContract;\n",
      'packages/@dvt/contracts/src/contracts/private.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-runtime-packages-to-scripts-or-tools',
    files: {
      'packages/@dvt/engine/src/index.ts':
        "import tool from '../../../../tools/runtime-helper.js'; export default tool;\n",
      'tools/runtime-helper.js': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-api-domain-to-application',
    files: {
      'apps/api/src/domain/value.ts':
        "import service from '../application/service.js'; export default service;\n",
      'apps/api/src/application/service.ts': 'export default 1;\n',
    },
  },
  {
    ruleName: 'no-api-application-to-fastify-or-jwt',
    files: {
      'apps/api/src/application/service.ts': "import token from 'jose'; export default token;\n",
    },
  },
  {
    ruleName: 'no-api-application-to-oidc-libs',
    files: {
      'apps/api/src/application/service.ts':
        "import client from 'openid-client'; export default client;\n",
    },
  },
  {
    ruleName: 'no-api-ports-to-http-types',
    files: {
      'apps/api/src/application/ports/port.ts':
        "import request from 'node:http'; export default request;\n",
    },
  },
  {
    ruleName: 'no-api-production-to-test-support',
    files: {
      'apps/api/src/index.ts':
        "import support from '../test/support.js'; export default support;\n",
      'apps/api/test/support.ts': 'export default 1;\n',
    },
  },
];

function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function readCruiserConfig() {
  return createRequire(import.meta.url)('../../.dependency-cruiser.cjs');
}

function extractForbiddenRuleNames(config) {
  return new Set((config.forbidden ?? []).map((rule) => rule.name));
}

function writeFixtureFiles(root, files) {
  for (const [filePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, filePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents);
  }
}

function writeTsConfig(root) {
  writeFixtureFiles(root, {
    'tsconfig.json': `${JSON.stringify({
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@dvt/engine': ['packages/@dvt/engine/src/index.ts'],
          '@dvt/engine/*': ['packages/@dvt/engine/src/*'],
          '@dvt/*': ['packages/@dvt/*'],
          '@dvt/*/*': ['packages/@dvt/*/*'],
        },
      },
    })}\n`,
  });
}

function collectDependencyViolations(files) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dvt-architecture-deps-'));
  try {
    for (const target of ['apps', 'packages', 'tools']) {
      mkdirSync(join(fixtureRoot, target), { recursive: true });
    }
    writeTsConfig(fixtureRoot);
    writeFixtureFiles(fixtureRoot, files);

    const result = spawnSync(
      process.execPath,
      [
        DEPCRUISE_BIN,
        'apps',
        'packages',
        'tools',
        '--config',
        DEPCRUISE_CONFIG,
        '--output-type',
        'json',
      ],
      { cwd: fixtureRoot, encoding: 'utf8' }
    );

    assert.equal(result.stderr, '');
    assert.equal(result.status, 0);

    return JSON.parse(result.stdout).summary.violations.map((violation) => violation.rule.name);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

test('root package exposes the architecture dependency guard', () => {
  const pkg = readJson('package.json');

  assert.equal(pkg.devDependencies?.['dependency-cruiser'], '17.3.9');
  assert.equal(pkg.scripts?.['arch:deps'], 'node tools/ci/check-architecture-dependencies.mjs');
  assert.equal(pkg.scripts?.['verify:prepush'], 'node scripts/verify-prepush.cjs');
  assert.ok(
    verifyPrepush
      .buildPrepushPlan(['apps/web/src/main.tsx'], { full: true })
      .some((step) => step.id === 'arch-deps')
  );
  assert.match(pkg.scripts?.['ci:code'] ?? '', /pnpm arch:deps/);
});

test('PR quality gate runs the architecture dependency guard remotely', () => {
  const workflow = readText('.github/workflows/pr-quality-gate.yml');
  const pushBaseFetchStep = workflow.match(
    /- name: Fetch architecture push comparison base[\s\S]*?(?=\n\s+- name:)/u
  )?.[0];
  const architectureStep = workflow.match(
    /- name: Validate architecture dependency boundaries[\s\S]*?(?=\n\s+- name:)/u
  )?.[0];

  for (const command of REQUIRED_ARCH_DEPENDENCY_COMMANDS) {
    assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.ok(pushBaseFetchStep, 'missing push comparison base fetch step');
  assert.match(pushBaseFetchStep, /if: github\.event_name == 'push'/u);
  assert.match(pushBaseFetchStep, /git fetch --no-tags --depth=1 origin "\$GIT_BASE"/u);
  assert.match(pushBaseFetchStep, /GIT_BASE: \$\{\{ github\.event\.before \}\}/u);
  assert.ok(architectureStep, 'missing architecture dependency workflow step');
  assert.match(architectureStep, /pull_request\.base\.sha/u);
  assert.match(architectureStep, /github\.event\.before/u);
  assert.match(architectureStep, /'origin\/main'/u);
  assert.ok(
    workflow.indexOf(pushBaseFetchStep) < workflow.indexOf(architectureStep),
    'push comparison base must be fetched before the architecture dependency guard runs'
  );
});

test('root dependency-cruiser config declares the initial Fowler boundary rules', () => {
  const ruleNames = extractForbiddenRuleNames(readCruiserConfig());

  for (const ruleName of REQUIRED_ARCH_DEPENDENCY_RULES) {
    assert.ok(ruleNames.has(ruleName), `missing architecture dependency rule: ${ruleName}`);
  }
});

test('root guard owns retained API rules and retires the stale package-local guard', () => {
  const rootRuleNames = extractForbiddenRuleNames(readCruiserConfig());
  const apiPackage = readJson('apps/api/package.json');

  for (const ruleName of REQUIRED_ARCH_DEPENDENCY_RULES) {
    assert.ok(rootRuleNames.has(ruleName), `missing root architecture rule: ${ruleName}`);
  }
  assert.equal(rootRuleNames.has('no-routes-direct-policy'), false);
  assert.equal(apiPackage.scripts?.['test:arch'], undefined);
  assert.equal(apiPackage.devDependencies?.['dependency-cruiser'], undefined);
  assert.equal(existsSync('apps/api/.dependency-cruiser.cjs'), false);
});

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

test('supported API profiles are proven from composition semantics and dynamic edges', () => {
  const profileEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [
          { module: '@dvt/adapter-postgres', dynamic: true },
          { module: '@dvt/engine/runtime', dynamic: true },
          { module: '@dvt/adapter-temporal', dynamic: true },
        ],
      },
    ],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          "async function buildProtectedRuntimeModule() { await import('@dvt/adapter-postgres'); }",
          'async function buildApp(env) { if (env.OIDC_JWKS_URI && env.OIDC_ISSUER && env.OIDC_AUDIENCE) { await buildProtectedRuntimeModule(); } else { publicOnly(); } }',
          'function buildObservability(env) { if (!env.OBS_ENABLED) return createNoopObservability(); return new OtelObservability({}); }',
          'class Reconciler { create() { const config = this.resolveConfig(); if (!config) return null; return this.createWorker(); } resolveConfig() { if (!this.env.DVT_INTENT_RECONCILER_ENABLED) return null; return {}; } createWorker() { return new IntentReconcilerWorker(); } }',
          'function createIntentReconcilerRuntimeComposition() { return new Reconciler(); }',
          "async function buildTemporal(context) { if (!context.env.TEMPORAL_ADDRESS) return null; return import('@dvt/adapter-temporal'); }",
          'async function main() { await buildApp(env); buildObservability(env); await createIntentReconcilerRuntimeComposition().create(); await buildTemporal(context); }',
          'main();',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(
    profileEvidence.map(({ profile, classification }) => [profile, classification]),
    [
      ['observability-noop', API_REACHABILITY_CLASSIFICATIONS.validNullObject],
      ['observability-otel', API_REACHABILITY_CLASSIFICATIONS.conditionalProduction],
      ['oidc-protected-runtime', API_REACHABILITY_CLASSIFICATIONS.conditionalProduction],
      ['oidc-public-only', API_REACHABILITY_CLASSIFICATIONS.conditionalProduction],
      ['postgres-protected-storage', API_REACHABILITY_CLASSIFICATIONS.conditionalProduction],
      ['reconciler-disabled', API_REACHABILITY_CLASSIFICATIONS.conditionalProduction],
      ['reconciler-enabled', API_REACHABILITY_CLASSIFICATIONS.conditionalProduction],
      ['temporal-provider', API_REACHABILITY_CLASSIFICATIONS.conditionalProduction],
    ]
  );
});

test('enabled profiles require the same executable scope and imported composition call path', () => {
  const profileEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [
          {
            module: './protected.js',
            resolved: 'apps/api/src/protected.ts',
            dynamic: false,
          },
        ],
      },
      {
        source: 'apps/api/src/profile.ts',
        dependencies: [{ module: '@dvt/adapter-temporal', dynamic: true }],
      },
      {
        source: 'apps/api/src/protected.ts',
        dependencies: [{ module: '@dvt/adapter-postgres', dynamic: true }],
      },
    ],
    productionSources: new Set([
      'apps/api/src/app.ts',
      'apps/api/src/profile.ts',
      'apps/api/src/protected.ts',
    ]),
    productionRoots: [
      'apps/api/src/app.ts',
      'apps/api/src/profile.ts',
      'apps/api/src/protected.ts',
    ],
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          "import { buildProtectedRuntimeModule } from './protected.js';",
          'async function buildApp(env) {',
          '  if (env.OIDC_JWKS_URI && env.OIDC_ISSUER && env.OIDC_AUDIENCE) { await buildProtectedRuntimeModule(); } else { publicOnly(); }',
          '}',
          'buildApp(env);',
        ].join('\n'),
      ],
      [
        'apps/api/src/profile.ts',
        [
          'function buildObservability(env) { if (!env.OBS_ENABLED) return createNoopObservability(); return null; }',
          'function disconnectedOtel() { return new OtelObservability({}); }',
          'class Reconciler { create() { return this.resolveConfig(); } resolveConfig() { if (!this.env.DVT_INTENT_RECONCILER_ENABLED) return null; return {}; } }',
          'function createIntentReconcilerRuntimeComposition() { return new Reconciler(); }',
          'function disconnectedWorker() { return new IntentReconcilerWorker(); }',
          'async function temporalGuard(context) { if (!context.env.TEMPORAL_ADDRESS) return null; return null; }',
          "async function disconnectedTemporal() { return import('@dvt/adapter-temporal'); }",
          'buildObservability(env);',
          'createIntentReconcilerRuntimeComposition().create();',
          'temporalGuard(context);',
        ].join('\n'),
      ],
      [
        'apps/api/src/protected.ts',
        [
          'export async function buildProtectedRuntimeModule() { return {}; }',
          "async function disconnectedPostgres() { return import('@dvt/adapter-postgres'); }",
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(
    profileEvidence.map(({ profile }) => profile),
    ['observability-noop', 'oidc-protected-runtime', 'oidc-public-only', 'reconciler-disabled']
  );
});

test('dead branches and uncalled same-class methods cannot prove enabled profiles', () => {
  const profileEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [
          {
            module: './protected.js',
            resolved: 'apps/api/src/protected.ts',
            dynamic: false,
          },
        ],
      },
      {
        source: 'apps/api/src/profile.ts',
        dependencies: [{ module: '@dvt/adapter-temporal', dynamic: true }],
      },
      {
        source: 'apps/api/src/protected.ts',
        dependencies: [{ module: '@dvt/adapter-postgres', dynamic: true }],
      },
    ],
    productionSources: new Set([
      'apps/api/src/app.ts',
      'apps/api/src/profile.ts',
      'apps/api/src/protected.ts',
    ]),
    productionRoots: [
      'apps/api/src/app.ts',
      'apps/api/src/profile.ts',
      'apps/api/src/protected.ts',
    ],
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          "import { buildProtectedRuntimeModule } from './protected.js';",
          'async function buildApp(env) {',
          '  if (env.OIDC_JWKS_URI && env.OIDC_ISSUER && env.OIDC_AUDIENCE) { await buildProtectedRuntimeModule(); } else { publicOnly(); }',
          '}',
          'buildApp(env);',
        ].join('\n'),
      ],
      [
        'apps/api/src/profile.ts',
        [
          'function buildObservability(env) {',
          '  if (!env.OBS_ENABLED) return createNoopObservability();',
          '  if (false) return new OtelObservability({});',
          '  return null;',
          '}',
          'class Reconciler {',
          '  create() { return this.resolveConfig(); }',
          '  resolveConfig() { if (!this.env.DVT_INTENT_RECONCILER_ENABLED) return null; return {}; }',
          '  neverCalled() { return new IntentReconcilerWorker(); }',
          '}',
          'function createIntentReconcilerRuntimeComposition() { return new Reconciler(); }',
          'async function buildTemporal(context) {',
          '  if (!context.env.TEMPORAL_ADDRESS) return null;',
          "  if (false) return import('@dvt/adapter-temporal');",
          '  return null;',
          '}',
          'buildObservability(env);',
          'createIntentReconcilerRuntimeComposition().create();',
          'buildTemporal(context);',
        ].join('\n'),
      ],
      [
        'apps/api/src/protected.ts',
        [
          'export async function buildProtectedRuntimeModule() {',
          "  if (false) return import('@dvt/adapter-postgres');",
          '  return {};',
          '}',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(
    profileEvidence.map(({ profile }) => profile),
    ['observability-noop', 'oidc-protected-runtime', 'oidc-public-only', 'reconciler-disabled']
  );
});

test('profile guards and reconciler orchestration must be reachable from composition entrypoints', () => {
  const deadGuardEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [
          {
            module: './protected.js',
            resolved: 'apps/api/src/protected.ts',
            dynamic: false,
          },
        ],
      },
      {
        source: 'apps/api/src/profile.ts',
        dependencies: [{ module: '@dvt/adapter-temporal', dynamic: true }],
      },
      {
        source: 'apps/api/src/protected.ts',
        dependencies: [{ module: '@dvt/adapter-postgres', dynamic: true }],
      },
    ],
    productionSources: new Set([
      'apps/api/src/app.ts',
      'apps/api/src/profile.ts',
      'apps/api/src/protected.ts',
    ]),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          "import { buildProtectedRuntimeModule } from './protected.js';",
          'async function buildApp(env) {',
          '  if (false) {',
          '    if (env.OIDC_JWKS_URI && env.OIDC_ISSUER && env.OIDC_AUDIENCE) { await buildProtectedRuntimeModule(); } else { publicOnly(); }',
          '  }',
          '}',
        ].join('\n'),
      ],
      [
        'apps/api/src/profile.ts',
        [
          'function buildObservability(env) {',
          '  if (false) { if (!env.OBS_ENABLED) return createNoopObservability(); }',
          '  return new OtelObservability({});',
          '}',
          'class Reconciler {',
          '  create() { const config = this.resolveConfig(); if (!config) return null; return this.createWorker(); }',
          '  resolveConfig() { if (false) { if (!this.env.DVT_INTENT_RECONCILER_ENABLED) return null; } return {}; }',
          '  createWorker() { return new IntentReconcilerWorker(); }',
          '}',
          'function createIntentReconcilerRuntimeComposition() { return new Reconciler(); }',
          'async function buildTemporal(context) {',
          '  if (false) { if (!context.env.TEMPORAL_ADDRESS) return null; }',
          "  return import('@dvt/adapter-temporal');",
          '}',
        ].join('\n'),
      ],
      [
        'apps/api/src/protected.ts',
        "export async function buildProtectedRuntimeModule() { return import('@dvt/adapter-postgres'); }",
      ],
    ]),
  });

  assert.deepEqual(deadGuardEvidence, []);

  const constantAndTerminatedEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/profile.ts',
        dependencies: [{ module: '@dvt/adapter-temporal', dynamic: true }],
      },
    ],
    productionSources: new Set(['apps/api/src/profile.ts']),
    productionRoots: ['apps/api/src/profile.ts'],
    sourceContents: new Map([
      [
        'apps/api/src/profile.ts',
        [
          'function buildObservability(env) {',
          '  if (!env.OBS_ENABLED) return createNoopObservability();',
          '  if (!true) return new OtelObservability({});',
          '  return null;',
          '}',
          'buildObservability(env);',
          'buildTemporal(context);',
          'async function buildTemporal(context) {',
          '  if (!context.env.TEMPORAL_ADDRESS) return null;',
          '  { return null; sideEffect(); }',
          "  return import('@dvt/adapter-temporal');",
          '}',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(
    constantAndTerminatedEvidence.map(({ profile }) => profile),
    ['observability-noop']
  );

  const deadOrchestratorEvidence = collectApiDeploymentProfileEvidence({
    modules: [{ source: 'apps/api/src/reconciler.ts', dependencies: [] }],
    productionSources: new Set(['apps/api/src/reconciler.ts']),
    productionRoots: ['apps/api/src/reconciler.ts'],
    sourceContents: new Map([
      [
        'apps/api/src/reconciler.ts',
        [
          'class Reconciler {',
          '  create() { this.resolveConfig(); return null; }',
          '  resolveConfig() { if (!this.env.DVT_INTENT_RECONCILER_ENABLED) return null; return {}; }',
          '  createWorker() { return new IntentReconcilerWorker(); }',
          '  neverCalled() { const config = this.resolveConfig(); if (!config) return null; return this.createWorker(); }',
          '}',
          'function createIntentReconcilerRuntimeComposition() { return new Reconciler(); }',
          'createIntentReconcilerRuntimeComposition().create();',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(
    deadOrchestratorEvidence.map(({ profile }) => profile),
    ['reconciler-disabled']
  );
});

test('profile evidence rejects dead JavaScript paths and uncalled composition scopes', () => {
  const controlFlowEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [{ module: '@dvt/adapter-temporal', dynamic: true }],
      },
    ],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function buildObservability(env) {',
          '  if (!env.OBS_ENABLED) return createNoopObservability();',
          '  if (0) return new OtelObservability({});',
          '  return null;',
          '}',
          'async function buildTemporalWithShortCircuit(context) {',
          '  if (!context.env.TEMPORAL_ADDRESS) return null;',
          "  false && (await import('@dvt/adapter-temporal'));",
          '  return null;',
          '}',
          'async function buildTemporalAfterTermination(context) {',
          '  if (!context.env.TEMPORAL_ADDRESS) return null;',
          '  try { return null; } finally { cleanup(); }',
          "  return import('@dvt/adapter-temporal');",
          '}',
          'buildObservability(env);',
          'buildTemporalWithShortCircuit(context);',
          'buildTemporalAfterTermination(context);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(
    controlFlowEvidence.map(({ profile }) => profile),
    ['observability-noop']
  );

  const uncalledScopeEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [{ module: '@dvt/adapter-temporal', dynamic: true }],
      },
    ],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function neverCalledObservability(env) {',
          '  if (!env.OBS_ENABLED) return createNoopObservability();',
          '  return new OtelObservability({});',
          '}',
          'async function neverCalledTemporal(context) {',
          '  if (!context.env.TEMPORAL_ADDRESS) return null;',
          "  return import('@dvt/adapter-temporal');",
          '}',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(uncalledScopeEvidence, []);

  const deadReconcilerEvidence = collectApiDeploymentProfileEvidence({
    modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'class Reconciler {',
          '  create() { return null; }',
          '  dead() { if (!this.env.DVT_INTENT_RECONCILER_ENABLED) return null; return new IntentReconcilerWorker(); }',
          '}',
          'if (false) {',
          '  function createIntentReconcilerRuntimeComposition() { return new Reconciler(); }',
          '}',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(deadReconcilerEvidence, []);
});

test('profile evidence requires invoked callbacks and consumed factory products', () => {
  const ignoredFunctionEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [
          { module: '@dvt/adapter-postgres', dynamic: true },
          { module: '@dvt/adapter-temporal', dynamic: true },
        ],
      },
    ],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function ignore(value) { return null; }',
          "async function buildProtectedRuntimeModule() { return import('@dvt/adapter-postgres'); }",
          'async function buildApp(env) { if (env.OIDC_JWKS_URI && env.OIDC_ISSUER && env.OIDC_AUDIENCE) { await buildProtectedRuntimeModule(); } else { publicOnly(); } }',
          'function buildObservability(env) { if (!env.OBS_ENABLED) return createNoopObservability(); return new OtelObservability({}); }',
          "async function buildTemporal(context) { if (!context.env.TEMPORAL_ADDRESS) return null; return import('@dvt/adapter-temporal'); }",
          'ignore(buildApp);',
          'ignore(buildObservability);',
          'ignore(buildTemporal);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(ignoredFunctionEvidence, []);

  const invokedFunctionEvidence = collectApiDeploymentProfileEvidence({
    modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function invoke(callback) { return callback(env); }',
          'function buildObservability(env) { if (!env.OBS_ENABLED) return createNoopObservability(); return new OtelObservability({}); }',
          'invoke(buildObservability);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(
    invokedFunctionEvidence.map(({ profile }) => profile),
    ['observability-noop', 'observability-otel']
  );

  const unconsumedFactoryEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [{ module: '@dvt/adapter-temporal', dynamic: true }],
      },
    ],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function createTemporalAdapterFactory() {',
          '  return {',
          '    async build(context) {',
          '      if (!context.env.TEMPORAL_ADDRESS) return null;',
          "      return import('@dvt/adapter-temporal');",
          '    },',
          '  };',
          '}',
          'createTemporalAdapterFactory();',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(unconsumedFactoryEvidence, []);

  const consumedFactoryEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [{ module: '@dvt/adapter-temporal', dynamic: true }],
      },
    ],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function createTemporalAdapterFactory() {',
          '  return {',
          '    async build(context) {',
          '      if (!context.env.TEMPORAL_ADDRESS) return null;',
          "      return import('@dvt/adapter-temporal');",
          '    },',
          '  };',
          '}',
          'async function consume(factories) { for (const factory of factories) await factory.build(context); }',
          'consume([createTemporalAdapterFactory()]);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(
    consumedFactoryEvidence.map(({ profile }) => profile),
    ['temporal-provider']
  );

  const staticFlowEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [{ module: '@dvt/adapter-temporal', dynamic: true }],
      },
    ],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function buildObservability(env) {',
          '  if (!env.OBS_ENABLED) return createNoopObservability();',
          '  if (false as boolean) return new OtelObservability({});',
          '  return null;',
          '}',
          'async function buildTemporal(context) {',
          '  if (!context.env.TEMPORAL_ADDRESS) return null;',
          '  switch (0) { default: return null; }',
          "  return import('@dvt/adapter-temporal');",
          '}',
          'buildObservability(env);',
          'buildTemporal(context);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(
    staticFlowEvidence.map(({ profile }) => profile),
    ['observability-noop']
  );
});

test('profile evidence excludes statically unselected switch clauses', () => {
  const inlineEvidence = collectApiDeploymentProfileEvidence({
    modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function buildObservability(env) {',
          "  switch ('off') {",
          "    case 'on':",
          '      if (!env.OBS_ENABLED) return createNoopObservability();',
          '      return new OtelObservability({});',
          '    default:',
          '      return null;',
          '  }',
          '}',
          'buildObservability(env);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(inlineEvidence, []);

  const callbackEvidence = collectApiDeploymentProfileEvidence({
    modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function invoke(callback) {',
          "  switch ('off') {",
          "    case 'on': return callback(env);",
          '    default: return null;',
          '  }',
          '}',
          'function buildObservability(env) { if (!env.OBS_ENABLED) return createNoopObservability(); return new OtelObservability({}); }',
          'invoke(buildObservability);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(callbackEvidence, []);

  const factoryEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/app.ts',
        dependencies: [{ module: '@dvt/adapter-temporal', dynamic: true }],
      },
    ],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function createTemporalAdapterFactory() {',
          '  return {',
          '    async build(context) {',
          '      if (!context.env.TEMPORAL_ADDRESS) return null;',
          "      return import('@dvt/adapter-temporal');",
          '    },',
          '  };',
          '}',
          'async function consume(factories) {',
          "  switch ('off') {",
          "    case 'on': for (const factory of factories) await factory.build(context); break;",
          '    default: return null;',
          '  }',
          '}',
          'consume([createTemporalAdapterFactory()]);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(factoryEvidence, []);

  const breakStopsFallthroughEvidence = collectApiDeploymentProfileEvidence({
    modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function buildObservability(env) {',
          "  switch ('on') {",
          "    case 'on': break;",
          "    case 'dead':",
          '      if (!env.OBS_ENABLED) return createNoopObservability();',
          '      return new OtelObservability({});',
          '    default: return null;',
          '  }',
          '  return null;',
          '}',
          'buildObservability(env);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(breakStopsFallthroughEvidence, []);

  const nestedBreakEvidence = collectApiDeploymentProfileEvidence({
    modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function buildObservability(env) {',
          "  switch ('on') {",
          "    case 'on': {",
          '      break;',
          '      if (!env.OBS_ENABLED) return createNoopObservability();',
          '      return new OtelObservability({});',
          '    }',
          '    default: return null;',
          '  }',
          '  return null;',
          '}',
          'buildObservability(env);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(nestedBreakEvidence, []);

  const nestedContinueEvidence = collectApiDeploymentProfileEvidence({
    modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function buildObservability(env) {',
          '  for (;;) {',
          "    switch ('on') {",
          "      case 'on': {",
          '        continue;',
          '        if (!env.OBS_ENABLED) return createNoopObservability();',
          '        return new OtelObservability({});',
          '      }',
          '      default: return null;',
          '    }',
          '  }',
          '}',
          'buildObservability(env);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(nestedContinueEvidence, []);

  const selectedFallthroughEvidence = collectApiDeploymentProfileEvidence({
    modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function buildObservability(env) {',
          "  switch ('on') {",
          "    case 'on':",
          "    case 'alias':",
          '      if (!env.OBS_ENABLED) return createNoopObservability();',
          '      return new OtelObservability({});',
          '    default:',
          '      return null;',
          '  }',
          '}',
          'buildObservability(env);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(
    selectedFallthroughEvidence.map(({ profile }) => profile),
    ['observability-noop', 'observability-otel']
  );

  const selectedDefaultEvidence = collectApiDeploymentProfileEvidence({
    modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
    productionSources: new Set(['apps/api/src/app.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/app.ts',
        [
          'function buildObservability(env) {',
          "  switch ('off') {",
          "    case 'on': return null;",
          '    default:',
          '      if (!env.OBS_ENABLED) return createNoopObservability();',
          '      return new OtelObservability({});',
          '  }',
          '}',
          'buildObservability(env);',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(
    selectedDefaultEvidence.map(({ profile }) => profile),
    ['observability-noop', 'observability-otel']
  );
});

test('profile evidence respects directed completion after switches', () => {
  const collectProfiles = (statements) =>
    collectApiDeploymentProfileEvidence({
      modules: [{ source: 'apps/api/src/app.ts', dependencies: [] }],
      productionSources: new Set(['apps/api/src/app.ts']),
      sourceContents: new Map([
        [
          'apps/api/src/app.ts',
          [
            'function buildObservability(env) {',
            ...statements,
            '}',
            'buildObservability(env);',
          ].join('\n'),
        ],
      ]),
    }).map(({ profile }) => profile);

  assert.deepEqual(
    collectProfiles([
      '  outer: {',
      "    switch ('on') { case 'on': break outer; }",
      '    if (!env.OBS_ENABLED) return createNoopObservability();',
      '    return new OtelObservability({});',
      '  }',
      '  return null;',
    ]),
    []
  );

  assert.deepEqual(
    collectProfiles([
      '  outer: {',
      "    switch ('on') { case 'on': try { break outer; } finally { cleanup(); } }",
      '    if (!env.OBS_ENABLED) return createNoopObservability();',
      '    return new OtelObservability({});',
      '  }',
      '  return null;',
    ]),
    []
  );

  assert.deepEqual(
    collectProfiles([
      '  for (;;) {',
      "    switch ('on') { case 'on': continue; }",
      '    if (!env.OBS_ENABLED) return createNoopObservability();',
      '    return new OtelObservability({});',
      '  }',
    ]),
    []
  );

  assert.deepEqual(
    collectProfiles([
      '  outer: for (;;) {',
      "    switch ('on') { case 'on': continue outer; }",
      '    if (!env.OBS_ENABLED) return createNoopObservability();',
      '    return new OtelObservability({});',
      '  }',
    ]),
    []
  );

  assert.deepEqual(
    collectProfiles([
      "  switch ('on') { case 'on': break; }",
      '  if (!env.OBS_ENABLED) return createNoopObservability();',
      '  return new OtelObservability({});',
    ]),
    ['observability-noop', 'observability-otel']
  );

  assert.deepEqual(
    collectProfiles([
      '  outer: {',
      "    switch ('on') { case 'on': if (env.skip) break outer; }",
      '    if (!env.OBS_ENABLED) return createNoopObservability();',
      '    return new OtelObservability({});',
      '  }',
    ]),
    ['observability-noop', 'observability-otel']
  );

  assert.deepEqual(
    collectProfiles([
      "  switch ('on') {",
      "    case 'on':",
      '      while (env.pending) { break; }',
      "      switch ('inner') { case 'inner': break; }",
      '      break;',
      '  }',
      '  if (!env.OBS_ENABLED) return createNoopObservability();',
      '  return new OtelObservability({});',
    ]),
    ['observability-noop', 'observability-otel']
  );
});

test('comments and disconnected tokens cannot prove deployment profiles', () => {
  const profileEvidence = collectApiDeploymentProfileEvidence({
    modules: [
      {
        source: 'apps/api/src/commentOnly.ts',
        dependencies: [
          { module: '@dvt/adapter-postgres', dynamic: true },
          { module: '@dvt/adapter-temporal', dynamic: true },
        ],
      },
    ],
    productionSources: new Set(['apps/api/src/commentOnly.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/commentOnly.ts',
        [
          '// OBS_ENABLED createNoopObservability() new OtelObservability()',
          '// OIDC_JWKS_URI OIDC_ISSUER OIDC_AUDIENCE buildProtectedRuntimeModule()',
          '// DVT_INTENT_RECONCILER_ENABLED return null createIntentReconcilerRuntimeComposition()',
          '// TEMPORAL_ADDRESS',
          'const OBS_ENABLED = true;',
          'const OIDC_JWKS_URI = true, OIDC_ISSUER = true, OIDC_AUDIENCE = true;',
          'const DVT_INTENT_RECONCILER_ENABLED = true, TEMPORAL_ADDRESS = true;',
          'if (false) { createNoopObservability(); buildProtectedRuntimeModule(); return null; }',
          'new OtelObservability(); createIntentReconcilerRuntimeComposition();',
          'export const value = { OBS_ENABLED, OIDC_JWKS_URI, OIDC_ISSUER, OIDC_AUDIENCE, DVT_INTENT_RECONCILER_ENABLED, TEMPORAL_ADDRESS };',
        ].join('\n'),
      ],
    ]),
  });

  assert.deepEqual(profileEvidence, []);
});

test('export reachability identifies a production module export used only by tests', () => {
  const evidence = collectApiExportReachabilityEvidence({
    modules: [
      {
        source: 'apps/api/src/runtime.ts',
        dependencies: [{ module: './factory.js', resolved: 'apps/api/src/factory.ts' }],
      },
      { source: 'apps/api/src/factory.ts', dependencies: [] },
      {
        source: 'apps/api/test/factory.test.ts',
        dependencies: [{ module: '../src/factory.js', resolved: 'apps/api/src/factory.ts' }],
      },
    ],
    productionSources: new Set(['apps/api/src/runtime.ts', 'apps/api/src/factory.ts']),
    sourceContents: new Map([
      [
        'apps/api/src/runtime.ts',
        "import { createRuntime } from './factory.js';\nexport const runtime = createRuntime();\n",
      ],
      [
        'apps/api/src/factory.ts',
        'export function createRuntime() { return {}; }\nexport function createWorkflowEngine() { return {}; }\n',
      ],
      [
        'apps/api/test/factory.test.ts',
        "import { createWorkflowEngine } from '../src/factory.js';\nvoid createWorkflowEngine;\n",
      ],
    ]),
  });

  assert.deepEqual(
    evidence.find(({ symbol }) => symbol === 'createWorkflowEngine'),
    {
      source: 'apps/api/src/factory.ts',
      symbol: 'createWorkflowEngine',
      classification: 'test-support-export',
      consumers: ['apps/api/test/factory.test.ts'],
    }
  );
});

test('current API report classifies every source and exposes cleanup candidates deterministically', async () => {
  const first = await collectApiProductionReachability(process.cwd(), { changedSourceFiles: [] });
  const second = await collectApiProductionReachability(process.cwd(), { changedSourceFiles: [] });

  const currentSourceCount = listFilesRecursive(resolve('apps/api/src')).filter((source) =>
    /\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/u.test(source)
  ).length;
  assert.equal(first.classifications.length, currentSourceCount);
  assert.deepEqual(
    first.classifications.filter(({ classification }) =>
      [
        API_REACHABILITY_CLASSIFICATIONS.testSupport,
        API_REACHABILITY_CLASSIFICATIONS.orphan,
      ].includes(classification)
    ),
    []
  );
  assert.equal(
    first.exportEvidence.find(({ symbol }) => symbol === 'createWorkflowEngine'),
    undefined
  );
  assert.equal(
    first.exportEvidence.find(
      ({ source }) =>
        source.includes('ManifestArtifactResolutionError') ||
        source.includes('ManifestArtifactResolver')
    ),
    undefined
  );
  assert.deepEqual(
    first.exportEvidence.filter(({ classification }) => classification === 'test-support-export'),
    []
  );
  assert.equal(
    first.exportEvidence.find(
      ({ source, symbol }) =>
        source === 'apps/api/src/modules/dbtProjectImport/buildDbtProjectImportRuntime.ts' &&
        symbol === 'DbtProjectImportRuntime'
    )?.classification,
    'production-export'
  );
  assert.ok(
    first.classifications.some(
      ({ classification }) =>
        classification === API_REACHABILITY_CLASSIFICATIONS.conditionalProduction
    )
  );
  assert.ok(
    first.classifications.some(
      ({ classification }) => classification === API_REACHABILITY_CLASSIFICATIONS.validNullObject
    )
  );
  assert.ok(first.profileEvidence.every(({ sources }) => sources.length > 0));
  assert.equal(formatApiReachabilityReport(first), formatApiReachabilityReport(second));
});

test('dependency-cruiser boundary rules fail for representative negative imports', () => {
  for (const fixture of DEPENDENCY_RULE_FIXTURES) {
    const violations = collectDependencyViolations(fixture.files);
    assert.ok(
      violations.includes(fixture.ruleName),
      `expected ${fixture.ruleName} to fail; got ${violations.join(', ')}`
    );
  }
});

test('dependency-cruiser boundary rules allow governed package entrypoints', () => {
  const violations = collectDependencyViolations({
    'apps/api/src/index.ts':
      "import runtime from '@dvt/engine/runtime'; import testing from '@dvt/engine/testing'; import engine from '@dvt/engine'; export default { runtime, testing, engine };\n",
    'packages/@dvt/engine/src/index.ts': 'export default 1;\n',
    'packages/@dvt/engine/src/runtime.ts': 'export default 2;\n',
    'packages/@dvt/engine/src/testing.ts': 'export default 3;\n',
  });

  assert.equal(violations.includes('no-cross-package-deep-imports'), false);
});

test('contracts can import the runtime-neutral crypto authority', () => {
  const violations = collectDependencyViolations({
    'packages/@dvt/contracts/src/index.ts':
      "import { sha256HexUtf8 } from '../../crypto/src/index.js'; export default sha256HexUtf8;\n",
    'packages/@dvt/crypto/src/index.ts': 'export const sha256HexUtf8 = (value) => value;\n',
  });

  assert.equal(violations.includes('no-contracts-to-dvt-runtime'), false);
});

test('Cut 1 crypto facades and duplicate implementations stay retired', () => {
  const retiredPaths = [
    'packages/@dvt/contracts/src/utils/jcsCanonicalize.ts',
    'packages/@dvt/contracts/src/utils/sha256HexUtf8.ts',
    'packages/@dvt/contracts/test/sha256HexUtf8.test.ts',
    'packages/@dvt/engine/src/utils/jcs.ts',
    'packages/@dvt/engine/src/utils/sha256.ts',
    'packages/@dvt/plan-verifier/src/crypto.ts',
  ];

  for (const retiredPath of retiredPaths) {
    assert.equal(existsSync(retiredPath), false, `${retiredPath} must not be restored`);
  }
});

test('Cut 3 command identity mechanics stay retired', () => {
  assert.equal(
    existsSync('apps/web/src/app/views/canvas/canvasDraftIdempotencyKey.ts'),
    false,
    'the Canvas-specific identity helper must not be restored'
  );

  const browserIdentity = readText(
    'apps/web/src/app/services/idempotency/createBrowserIdempotencyKey.ts'
  );
  assert.match(browserIdentity, /import \{ randomUuidV4 \} from '@dvt\/crypto';/u);
  assert.doesNotMatch(
    browserIdentity,
    /getRandomValues|randomUUID|Date\.now|Math\.random/u,
    'Web command identities must not reimplement UUID or weak fallback mechanics'
  );

  const startRunIdentity = readText('apps/api/src/entrypoints/http/startRunIdentity.ts');
  assert.match(startRunIdentity, /import \{ randomUuidV7 \} from '@dvt\/crypto';/u);
  assert.doesNotMatch(
    startRunIdentity,
    /node:crypto|randomBytes|function generateUuidV7|function formatUuid/u,
    'Start Run must not reimplement UUIDv7 mechanics'
  );
});

test('Cut 4 tooling crypto mechanics and duplicate runner stay retired', () => {
  assert.equal(
    existsSync('scripts/run-golden-paths.cjs'),
    false,
    'the unreferenced root golden-path runner must not be restored'
  );

  const trackedFiles = spawnSync(
    'git',
    ['ls-files', '--', 'scripts', 'tools', 'packages/@dvt/cli'],
    { encoding: 'utf8' }
  );
  assert.equal(trackedFiles.stderr, '');
  assert.equal(trackedFiles.status, 0);

  const findings = [];
  for (const sourcePath of trackedFiles.stdout.split(/\r?\n/u).filter(Boolean)) {
    if (!existsSync(sourcePath) || !/\.[cm]?[jt]sx?$/u.test(sourcePath)) {
      continue;
    }

    const source = readText(sourcePath);
    if (/\b(?:crypto\.)?createHash\s*\(/u.test(source)) {
      findings.push(`${sourcePath}: createHash`);
    }
    if (/\b(?:crypto\.)?randomUUID\s*\(/u.test(source)) {
      findings.push(`${sourcePath}: randomUUID`);
    }
  }

  assert.deepEqual(findings.sort(), []);
});

test('repository consumers import crypto primitives from their authority', () => {
  const trackedFiles = spawnSync('git', ['ls-files', '--', 'apps', 'packages'], {
    encoding: 'utf8',
  });
  assert.equal(trackedFiles.stderr, '');
  assert.equal(trackedFiles.status, 0);

  const forbiddenContractExports = new Set(['jcsCanonicalize', 'sha256HexUtf8']);
  const findings = [];

  for (const sourcePath of trackedFiles.stdout.split(/\r?\n/u).filter(Boolean)) {
    if (!/\.[cm]?[jt]sx?$/u.test(sourcePath)) {
      continue;
    }

    const sourceFile = ts.createSourceFile(
      sourcePath,
      readText(sourcePath),
      ts.ScriptTarget.Latest,
      true
    );
    for (const statement of sourceFile.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== '@dvt/contracts'
      ) {
        continue;
      }

      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) {
        continue;
      }

      for (const element of bindings.elements) {
        const importedName = element.propertyName?.text ?? element.name.text;
        if (forbiddenContractExports.has(importedName)) {
          findings.push(`${sourcePath}: ${importedName}`);
        }
      }
    }
  }

  assert.deepEqual(findings.sort(), []);
});

test('type-only cycles enrich reachability without becoming runtime cycle violations', () => {
  const violations = collectDependencyViolations({
    'packages/@dvt/engine/src/a.ts':
      "import type { B } from './b.js'; export interface A { readonly b: B }\n",
    'packages/@dvt/engine/src/b.ts':
      "import type { A } from './a.js'; export interface B { readonly a: A }\n",
  });

  assert.equal(violations.includes('no-dvt-package-cycles'), false);
});

test('semantic architecture guard rejects adapter-owned canonical contract definitions', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dvt-adapter-contracts-'));
  try {
    writeFixtureFiles(fixtureRoot, {
      'packages/@dvt/adapter-postgres/src/contracts/PostgresRunCommand.v1.ts':
        'export interface PostgresRunCommandV1 { readonly runId: string; }\n',
      'packages/@dvt/adapter-postgres/src/PostgresRunSchema.v1.ts':
        'export const PostgresRunSchemaV1 = {};\n',
    });

    const findings = collectAdapterCanonicalContractFindings(fixtureRoot);

    assert.deepEqual(
      new Set(findings.map((finding) => finding.ruleName)),
      new Set(REQUIRED_SEMANTIC_ARCHITECTURE_RULES)
    );
    assert.equal(findings.length, 2);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('repository adapters do not own canonical contract definitions', () => {
  assert.deepEqual(collectAdapterCanonicalContractFindings(process.cwd()), []);
});
