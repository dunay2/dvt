/**
 * Owned concern: Reject dead JavaScript paths and disconnected composition scopes.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectApiDeploymentProfileEvidence } from '../check-architecture-dependencies.mjs';

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
