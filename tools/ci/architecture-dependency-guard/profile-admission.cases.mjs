/**
 * Owned concern: Prove required deployment profiles from their real composition entrypoints.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  API_REACHABILITY_CLASSIFICATIONS,
  collectApiDeploymentProfileEvidence,
} from '../check-architecture-dependencies.mjs';

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
