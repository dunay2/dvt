export type ReconcilerHealthStatus = 'starting' | 'healthy' | 'disabled' | 'degraded';

export type ReconcilerHealthReasonCode = 'bootstrap_failed' | 'runtime_unavailable';

export type ReconcilerHealthState = {
  status: ReconcilerHealthStatus;
  reasonCode?: ReconcilerHealthReasonCode;
};
