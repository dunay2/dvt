/**
 * Owned concern: Require executable composition and reconciler scopes for deployment evidence.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectApiDeploymentProfileEvidence } from '../check-architecture-dependencies.mjs';

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
