export const START_RUN_MESSAGE = {
  startingRun: 'Starting run',
  compensationCancelFailed: 'Compensation cancelRun failed after bootstrap error',
  providerRefReconciliationFailed:
    'ProviderRef reconciliation failed after adapter.startRun returned a different EngineRunRef',
  providerRefReconciliationCancelFailed:
    'Compensation cancelRun failed after providerRef reconciliation failure',
  markResolvedFailed: 'markResolved failed; leaving intent cleanup to reconciliation worker',
  startRunFailed: 'startRun failed',
  postStartIntentPersistenceFailed:
    'Provider workflow started but intent persistence failed; leaving reconciliation to maintenance worker',
  skipRunFailedPendingIntent:
    'Skipping RunFailed emission after startRun error because intent remains pending',
  runFailedEmissionFailed: 'RunFailed emission failed after startRun error',
} as const;

export const START_RUN_FAILURE_REASON = {
  startRunFailure: 'START_RUN_FAILURE',
} as const;
