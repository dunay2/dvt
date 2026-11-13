/**
 * Owned concern: Reject unreachable branches and uncalled methods as deployment evidence.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectApiDeploymentProfileEvidence } from '../check-architecture-dependencies.mjs';

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
