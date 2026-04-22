import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

const {
  normalizeGitPath,
  isDeterminismSensitiveFile,
  shouldRunDeterminismPrecommit,
} = require('../../scripts/run-determinism-precommit.cjs');

test('normalizeGitPath makes Windows-style git paths comparable', () => {
  assert.equal(
    normalizeGitPath('.\\packages\\@dvt\\engine\\src\\index.ts'),
    'packages/@dvt/engine/src/index.ts'
  );
});

test('shouldRunDeterminismPrecommit skips unrelated staged files', () => {
  assert.equal(
    shouldRunDeterminismPrecommit([
      'docs/planning/reviews/ci-and-delivery/20260422-environment-configuration-audit-review.md',
      'apps/web/src/app/views/canvas/CanvasViewport.tsx',
    ]),
    false
  );
});

test('shouldRunDeterminismPrecommit runs for engine source changes', () => {
  assert.equal(
    shouldRunDeterminismPrecommit(['packages/@dvt/engine/src/security/hostRiskClassifier.ts']),
    true
  );
});

test('shouldRunDeterminismPrecommit runs for Temporal workflow changes only', () => {
  assert.equal(
    shouldRunDeterminismPrecommit([
      'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts',
    ]),
    true
  );
  assert.equal(
    shouldRunDeterminismPrecommit(['packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts']),
    false
  );
});

test('isDeterminismSensitiveFile keeps config changes fail-closed', () => {
  assert.equal(isDeterminismSensitiveFile('eslint.config.cjs'), true);
  assert.equal(isDeterminismSensitiveFile('package.json'), true);
  assert.equal(isDeterminismSensitiveFile('pnpm-lock.yaml'), true);
});
