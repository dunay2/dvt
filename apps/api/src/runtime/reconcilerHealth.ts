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

type ReconcilerHealthyState = {
  status:
    | (typeof RECONCILER_HEALTH_STATUS)['starting']
    | (typeof RECONCILER_HEALTH_STATUS)['healthy']
    | (typeof RECONCILER_HEALTH_STATUS)['disabled'];
};

type ReconcilerDegradedState = {
  status: (typeof RECONCILER_HEALTH_STATUS)['degraded'];
  reasonCode: ReconcilerHealthReasonCode;
};

export type ReconcilerHealthState = ReconcilerHealthyState | ReconcilerDegradedState;
