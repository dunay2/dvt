'use strict';

const INVARIANT_ORDER = Object.freeze([
  'all_commands_accepted',
  'all_runs_completed',
  'event_sequences_contiguous',
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

module.exports = {
  INVARIANT_ORDER,
  evaluateRuntimeProof,
  percentile,
};
