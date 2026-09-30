/**
 * @ownedConcern Own stable start-run diagnostic identifiers and messages.
 */
export const START_RUN_MESSAGE = {
  startingRun: 'Starting run',
  compensationCancelFailed: 'Compensation cancelRun failed after bootstrap error',
  providerRefReconciliationFailed:
    'ProviderRef reconciliation failed after adapter.startRun returned a different EngineRunRef',
  providerRefReconciliationCancelFailed:
    'Compensation cancelRun failed after providerRef reconciliation failure',
  markResolvedFailed: 'markResolved failed; leaving intent cleanup to reconciliation worker',
  markResolvedReportingFailed:
    '[dvt][StartRunFailurePolicy] markResolved observability reporting failed;',
  intentPersistenceError: 'Intent persistence failed after adapter.startRun succeeded',
  startRunFailed: 'startRun failed',
  postStartIntentPersistenceFailed:
    'Provider workflow started but intent persistence failed; leaving reconciliation to maintenance worker',
  skipRunFailedPendingIntent:
    'Skipping RunFailed emission after startRun error because intent remains pending',
  skipRunFailedUnavailableAuthority:
    'Skipping RunFailed emission because start-run authority could not be established',
  runFailedEmissionFailed: 'RunFailed emission failed after startRun error',
} as const;

export const START_RUN_FAILURE_REASON = {
  startRunFailure: 'START_RUN_FAILURE',
} as const;

export const START_RUN_METRIC = {
  intentMarkResolvedFailedTotal: 'dvt.intent.mark_resolved_failed_total',
  startFailedTotal: 'dvt.run.start_failed_total',
} as const;

export const START_RUN_AUTHORITY_REASON = {
  metadataReadFailed: 'metadata_read_failed',
  metadataMissing: 'metadata_missing',
  intentReadFailed: 'intent_read_failed',
  intentMissing: 'intent_missing',
} as const;
