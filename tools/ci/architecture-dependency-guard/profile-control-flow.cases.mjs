/**
 * Owned concern: Prove switch selection and directed completion without accepting disconnected tokens.
 * Why: retain this independent proof family under the existing native guard entrypoint.
 * Corner: original fixture inputs and assertions remain the acceptance evidence.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectApiDeploymentProfileEvidence } from '../check-architecture-dependencies.mjs';
import {
  inlineInput,
  callbackInput,
  factoryInput,
  breakStopsFallthroughInput,
  nestedBreakInput,
  nestedContinueInput,
  selectedFallthroughInput,
  selectedDefaultInput,
} from './switch-selection-fixtures.mjs';
import {
  labelledBreakStatements,
  labelledFinallyBreakStatements,
  loopContinueStatements,
  labelledContinueStatements,
  selectedBreakStatements,
  conditionalBreakStatements,
  nestedLoopSwitchStatements,
} from './switch-completion-fixtures.mjs';

test('profile evidence excludes statically unselected switch clauses', () => {
  const inlineEvidence = collectApiDeploymentProfileEvidence(inlineInput);

  assert.deepEqual(inlineEvidence, []);

  const callbackEvidence = collectApiDeploymentProfileEvidence(callbackInput);

  assert.deepEqual(callbackEvidence, []);

  const factoryEvidence = collectApiDeploymentProfileEvidence(factoryInput);

  assert.deepEqual(factoryEvidence, []);

  const breakStopsFallthroughEvidence = collectApiDeploymentProfileEvidence(
    breakStopsFallthroughInput
  );

  assert.deepEqual(breakStopsFallthroughEvidence, []);

  const nestedBreakEvidence = collectApiDeploymentProfileEvidence(nestedBreakInput);

  assert.deepEqual(nestedBreakEvidence, []);

  const nestedContinueEvidence = collectApiDeploymentProfileEvidence(nestedContinueInput);

  assert.deepEqual(nestedContinueEvidence, []);

  const selectedFallthroughEvidence = collectApiDeploymentProfileEvidence(selectedFallthroughInput);

  assert.deepEqual(
    selectedFallthroughEvidence.map(({ profile }) => profile),
    ['observability-noop', 'observability-otel']
  );

  const selectedDefaultEvidence = collectApiDeploymentProfileEvidence(selectedDefaultInput);

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

  assert.deepEqual(collectProfiles(labelledBreakStatements), []);

  assert.deepEqual(collectProfiles(labelledFinallyBreakStatements), []);

  assert.deepEqual(collectProfiles(loopContinueStatements), []);

  assert.deepEqual(collectProfiles(labelledContinueStatements), []);

  assert.deepEqual(collectProfiles(selectedBreakStatements), [
    'observability-noop',
    'observability-otel',
  ]);

  assert.deepEqual(collectProfiles(conditionalBreakStatements), [
    'observability-noop',
    'observability-otel',
  ]);

  assert.deepEqual(collectProfiles(nestedLoopSwitchStatements), [
    'observability-noop',
    'observability-otel',
  ]);
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
