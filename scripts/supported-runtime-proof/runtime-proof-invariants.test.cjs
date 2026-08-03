'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  calculateRatePerSecond,
  INVARIANT_ORDER,
  evaluateRuntimeProof,
  isDeliveryOrderPreserved,
  percentile,
} = require('./runtime-proof-invariants.cjs');

function passingReport(overrides = {}) {
  return {
    expectedAcceptedCommandCount: 8,
    acceptedCommandCount: 8,
    startErrorCount: 0,
    completedRunCount: 8,
    failedRunCount: 0,
    eventSequencesContiguous: true,
    persistedEventCount: 64,
    deliveredEventCount: 64,
    deliveryOrderPreserved: true,
    pendingOutboxCount: 0,
    duplicateDeliveryCount: 0,
    snapshotReplayMismatchCount: 0,
    postgresInterruptionRejected: true,
    postgresRecoveryCompleted: true,
    observations: {
      endToEndEventThroughputPerSecond: 2.25,
      projectionFreshnessMs: 200,
      startLatencyMs: { p95: 400 },
      completionDurationMs: { p95: 2_500 },
      workerRecoveryMs: 3_100,
      postgresRecoveryMs: 13_400,
    },
    ...overrides,
  };
}

const PASSING_BUDGETS = Object.freeze({
  minimumEventThroughputPerSecond: 1.5,
  maximumProjectionFreshnessMs: 1_000,
  maximumStartLatencyP95Ms: 750,
  maximumCompletionDurationP95Ms: 5_000,
  maximumWorkerRecoveryMs: 6_000,
  maximumPostgresRecoveryMs: 25_000,
});

test('proof evaluation accepts only a complete vertical with every invariant satisfied', () => {
  const result = evaluateRuntimeProof(passingReport(), PASSING_BUDGETS);

  assert.equal(result.passed, true);
  assert.equal(result.firstFailure, null);
  assert.deepEqual(
    result.findings.map(({ invariant }) => invariant),
    INVARIANT_ORDER
  );
});

test('proof evaluation reports the first failed invariant deterministically', () => {
  const result = evaluateRuntimeProof(
    passingReport({
      acceptedCommandCount: 7,
      pendingOutboxCount: 2,
    }),
    PASSING_BUDGETS
  );

  assert.equal(result.passed, false);
  assert.equal(result.firstFailure, 'all_commands_accepted');
  assert.deepEqual(
    result.findings.filter(({ passed }) => !passed).map(({ invariant }) => invariant),
    ['all_commands_accepted', 'outbox_backlog_drained']
  );
});

test('proof evaluation names each exceeded measured budget', () => {
  const result = evaluateRuntimeProof(
    passingReport({
      observations: {
        ...passingReport().observations,
        endToEndEventThroughputPerSecond: 1.49,
        postgresRecoveryMs: 25_001,
      },
    }),
    PASSING_BUDGETS
  );

  assert.deepEqual(
    result.findings.filter(({ passed }) => !passed).map(({ invariant }) => invariant),
    ['event_throughput_within_budget', 'postgres_recovery_within_budget']
  );
});

test('percentile uses the nearest-rank definition without mutating observations', () => {
  const values = [40, 10, 30, 20];

  assert.equal(percentile(values, 0.95), 40);
  assert.deepEqual(values, [40, 10, 30, 20]);
  assert.equal(percentile([], 0.95), null);
});

test('delivery order is evaluated independently for each interleaved run', () => {
  assert.equal(
    isDeliveryOrderPreserved([
      { runId: 'run-1', runSeq: 1 },
      { runId: 'run-2', runSeq: 1 },
      { runId: 'run-1', runSeq: 2 },
      { runId: 'run-2', runSeq: 2 },
    ]),
    true
  );
  assert.equal(
    isDeliveryOrderPreserved([
      { runId: 'run-1', runSeq: 2 },
      { runId: 'run-1', runSeq: 1 },
    ]),
    false
  );
});

test('throughput rate is derived from observed count and elapsed time', () => {
  assert.equal(calculateRatePerSecond(72, 36_000), 2);
  assert.equal(calculateRatePerSecond(9, 1_500), 6);
});
