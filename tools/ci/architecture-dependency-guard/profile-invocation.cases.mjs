/**
 * Owned concern: Require invoked callbacks and consumed factory products for profile evidence.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectApiDeploymentProfileEvidence } from '../check-architecture-dependencies.mjs';

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
