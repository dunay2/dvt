'use strict';

const INVARIANT_ORDER = Object.freeze([
  'all_commands_accepted',
  'all_runs_completed',
  'event_sequences_contiguous',
  'all_events_delivered',
  'delivery_order_preserved',
  'outbox_backlog_drained',
  'no_duplicate_deliveries',
  'snapshots_match_replay',
  'postgres_interruption_failed_closed',
  'postgres_recovery_completed',
]);

function evaluateRuntimeProof(report) {
  const checks = {
    all_commands_accepted:
      report.acceptedCommandCount === report.expectedAcceptedCommandCount &&
      report.startErrorCount === 0,
    all_runs_completed:
      report.completedRunCount === report.expectedAcceptedCommandCount &&
      report.failedRunCount === 0,
    event_sequences_contiguous: report.eventSequencesContiguous === true,
    all_events_delivered: report.deliveredEventCount === report.persistedEventCount,
    delivery_order_preserved: report.deliveryOrderPreserved === true,
    outbox_backlog_drained: report.pendingOutboxCount === 0,
    no_duplicate_deliveries: report.duplicateDeliveryCount === 0,
    snapshots_match_replay: report.snapshotReplayMismatchCount === 0,
    postgres_interruption_failed_closed: report.postgresInterruptionRejected === true,
    postgres_recovery_completed: report.postgresRecoveryCompleted === true,
  };

  const findings = INVARIANT_ORDER.map((invariant) => ({
    invariant,
    passed: checks[invariant],
  }));

  return {
    passed: findings.every((finding) => finding.passed),
    firstFailure: findings.find((finding) => !finding.passed)?.invariant ?? null,
    findings,
  };
}

function percentile(values, percentileValue) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  if (!(percentileValue > 0 && percentileValue <= 1)) {
    throw new Error('percentileValue must be greater than 0 and at most 1');
  }

  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.ceil(percentileValue * ordered.length) - 1;
  return ordered[index];
}

function isDeliveryOrderPreserved(deliveries) {
  const sequencesByRun = new Map();
  for (const delivery of deliveries) {
    if (typeof delivery?.runId !== 'string' || !Number.isInteger(delivery.runSeq)) {
      return false;
    }
    const sequences = sequencesByRun.get(delivery.runId) ?? [];
    sequences.push(delivery.runSeq);
    sequencesByRun.set(delivery.runId, sequences);
  }

  return [...sequencesByRun.values()].every((sequences) =>
    sequences.every((runSeq, index) => runSeq === index + 1)
  );
}

function calculateRatePerSecond(count, durationMs) {
  if (!Number.isFinite(count) || count < 0 || !Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('count must be non-negative and durationMs must be positive');
  }
  return Number(((count * 1_000) / durationMs).toFixed(2));
}

module.exports = {
  calculateRatePerSecond,
  INVARIANT_ORDER,
  evaluateRuntimeProof,
  isDeliveryOrderPreserved,
  percentile,
};
