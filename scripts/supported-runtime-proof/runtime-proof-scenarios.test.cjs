'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { SUPPORTED_RUNTIME_PROOF_PROFILE } = require('./runtime-proof-profile.cjs');
const {
  recoverPostgresRuntime,
  startAndWaitForCompletion,
  waitForCondition,
} = require('./runtime-proof-scenarios.cjs');

test('startAndWaitForCompletion follows the protected command with the authoritative query', async () => {
  let reads = 0;
  const api = {
    startRun: async () => ({
      body: { accepted: true, runId: 'run-1' },
      durationMs: 12,
    }),
    getRun: async () => {
      reads += 1;
      return { body: { status: reads === 1 ? 'RUNNING' : 'COMPLETED' } };
    },
  };
  const profile = {
    ...SUPPORTED_RUNTIME_PROOF_PROFILE,
    workload: { ...SUPPORTED_RUNTIME_PROOF_PROFILE.workload, runCompletionTimeoutMs: 1_000 },
  };

  const result = await startAndWaitForCompletion(api, { planRef: { planId: 'plan-1' } }, profile);

  assert.equal(result.runId, 'run-1');
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.startLatencyMs, 12);
  assert.equal(reads, 2);
});

test('waitForCondition reports the bounded condition name on timeout', async () => {
  await assert.rejects(
    waitForCondition(async () => false, 10, 'outbox recovery', 1),
    /outbox recovery did not complete within 10ms/
  );
});

test('recoverPostgresRuntime restores database readiness before replacing the outbox host', async () => {
  const calls = [];
  const lifecycle = {
    startPostgres: () => calls.push('start-postgres'),
    waitForApiDatabase: async () => calls.push('api-ready'),
    restartOutbox: async () => calls.push('restart-outbox'),
  };

  await recoverPostgresRuntime(lifecycle);

  assert.deepEqual(calls, ['start-postgres', 'api-ready', 'restart-outbox']);
});
