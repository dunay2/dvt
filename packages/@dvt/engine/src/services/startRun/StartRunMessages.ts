export const START_RUN_MESSAGE = {
  startingRun: 'Starting run',
  saveProviderRefFailed:
    'saveProviderRef failed after startRun; metadata retains estimated providerRunId',
  compensationCancelFailed: 'Compensation cancelRun failed after bootstrap error',
  markResolvedFailed: 'markResolved failed; leaving intent cleanup to reconciliation worker',
  startRunFailed: 'startRun failed',
  postStartIntentPersistenceFailed:
    'Provider workflow started but intent persistence failed; leaving reconciliation to maintenance worker',
  skipRunFailedPendingIntent:
    'Skipping RunFailed emission after startRun error because intent remains pending',
  runFailedEmissionFailed: 'RunFailed emission failed after startRun error',
} as const;
