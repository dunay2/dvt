export const RECONCILER_HEALTH_STATUS = Object.freeze({
  starting: 'starting',
  healthy: 'healthy',
  disabled: 'disabled',
  degraded: 'degraded',
} as const);

export const RECONCILER_HEALTH_REASON_CODE = Object.freeze({
  bootstrapFailed: 'bootstrap_failed',
  runtimeUnavailable: 'runtime_unavailable',
} as const);

export type ReconcilerHealthStatus =
  (typeof RECONCILER_HEALTH_STATUS)[keyof typeof RECONCILER_HEALTH_STATUS];

export type ReconcilerHealthReasonCode =
  (typeof RECONCILER_HEALTH_REASON_CODE)[keyof typeof RECONCILER_HEALTH_REASON_CODE];

export type ReconcilerHealthState = {
  status: ReconcilerHealthStatus;
  reasonCode?: ReconcilerHealthReasonCode;
};
