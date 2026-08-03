'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  SUPPORTED_RUNTIME_PROOF_PROFILE,
  validateSupportedRuntimeProofProfile,
} = require('./runtime-proof-profile.cjs');

test('the MVP profile is versioned, bounded, and valid', () => {
  assert.equal(SUPPORTED_RUNTIME_PROOF_PROFILE.schemaVersion, 'dvt-supported-runtime-proof/v1');
  assert.equal(SUPPORTED_RUNTIME_PROOF_PROFILE.baselineRunCount, 3);
  assert.equal(SUPPORTED_RUNTIME_PROOF_PROFILE.workload.steadyState.concurrency, 1);
  assert.equal(SUPPORTED_RUNTIME_PROOF_PROFILE.budgets.minimumEventThroughputPerSecond, 1.5);
  assert.equal(validateSupportedRuntimeProofProfile(SUPPORTED_RUNTIME_PROOF_PROFILE).length, 0);
  assert.equal(Object.isFrozen(SUPPORTED_RUNTIME_PROOF_PROFILE.workload.steadyState), true);
});

test('profile validation rejects unbounded or ambiguous workload settings', () => {
  const failures = validateSupportedRuntimeProofProfile({
    schemaVersion: 'unknown',
    scope: { tenantId: '', projectId: 'project', environmentId: 'env' },
    workload: {
      steadyState: { runCount: 1, concurrency: 2 },
      workerInterruption: { runCount: 0 },
    },
  });

  assert.deepEqual(failures, [
    'schemaVersion must be dvt-supported-runtime-proof/v1',
    'scope.tenantId must be a non-empty string',
    'baselineRunCount must be a positive integer',
    'budgets must be an object',
    'workload.runCompletionTimeoutMs must be a positive integer',
    'workload.steadyState.concurrency cannot exceed runCount',
    'workload.workerInterruption.runCount must be a positive integer',
  ]);
});
