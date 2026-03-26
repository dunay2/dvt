export const RUN_MAINTENANCE_MESSAGE = {
  skipStuckRunWithoutCreatedAt: 'Skipping stuck-run candidate without createdAt',
  transitionedStuckRunToFailed: 'Transitioned stuck run to RunFailed',
  transitionedCancellingRunToFailed: 'Transitioned cancelling run to RunFailed',
  pendingIntentLookupUnsupported:
    'Keeping orphaned PENDING intent unresolved because provider lookup is unsupported',
  pendingIntentLookupFailed:
    'Keeping orphaned PENDING intent unresolved because provider lookup failed',
  pendingIntentExpiredAfterCancel:
    'Expired PENDING intent and cancelled orphaned provider workflow',
  pendingIntentCancelFailed: 'Failed to cancel orphaned provider workflow for PENDING intent',
  pendingIntentBootstrappedWithoutWorkflow:
    'Keeping orphaned PENDING intent unresolved because run is bootstrapped but provider workflow was not found',
  pendingIntentExpiredNoWorkflow: 'Expired orphaned PENDING intent (no provider workflow)',
  dispatchedIntentResolvedBootstrapped:
    'Resolved orphaned DISPATCHED intent (run already bootstrapped)',
  dispatchedIntentMissingAdapterOrRef:
    'Cannot cancel orphaned intent: adapter or engineRunRef missing',
  dispatchedIntentCancelled: 'Cancelled orphaned provider workflow from DISPATCHED intent',
  dispatchedIntentCancelFailed: 'Failed to cancel orphaned provider workflow',
} as const;

export const RUN_MAINTENANCE_RUN_FAILED_REASON = {
  queuedTimeout: 'QUEUED_TIMEOUT',
  cancellationTimeout: 'CANCELLATION_TIMEOUT',
} as const;

export type RunMaintenanceRunFailedReason =
  (typeof RUN_MAINTENANCE_RUN_FAILED_REASON)[keyof typeof RUN_MAINTENANCE_RUN_FAILED_REASON];

export const RUN_MAINTENANCE_METRIC = {
  queuedTimeoutTotal: 'dvt.run.queued_timeout_total',
  cancellationTimeoutTotal: 'dvt.run.cancellation_timeout_total',
  intentExpiredAfterCancelTotal: 'dvt.intent.expired_after_cancel_total',
  intentExpiredTotal: 'dvt.intent.expired_total',
  intentCancelledTotal: 'dvt.intent.cancelled_total',
} as const;

export const RUN_MAINTENANCE_OPERATION = {
  detectStuckRuns: 'detectStuckRuns',
  detectStuckCancellingRuns: 'detectStuckCancellingRuns',
  reconcileOrphanedIntents: 'reconcileOrphanedIntents',
} as const;

export const RUN_MAINTENANCE_RUN_STATUS = {
  pending: 'PENDING',
  running: 'RUNNING',
} as const;
export type RunMaintenanceRunStatus =
  (typeof RUN_MAINTENANCE_RUN_STATUS)[keyof typeof RUN_MAINTENANCE_RUN_STATUS];

export const RUN_MAINTENANCE_INTENT_STATUS = {
  pending: 'PENDING',
  dispatched: 'DISPATCHED',
} as const;
export type RunMaintenanceIntentStatus =
  (typeof RUN_MAINTENANCE_INTENT_STATUS)[keyof typeof RUN_MAINTENANCE_INTENT_STATUS];

export const RUN_MAINTENANCE_EVENT_TYPE = {
  runFailed: 'RunFailed',
  runCancelRequested: 'RunCancelRequested',
} as const;

export const RUN_MAINTENANCE_CONTEXT = {
  systemTenantId: 'system',
  projectId: 'maintenance',
  environmentId: 'maintenance',
  runId: 'maintenance',
} as const;

export const RUN_MAINTENANCE_NUMERIC = {
  defaultLimit: 100,
  metricIncrement: 1,
  eventPayloadVersion: 1,
  engineAttemptId: 1,
} as const;
