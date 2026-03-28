export type OverallHealthStatus = 'healthy' | 'degraded';

export type ReconcilerHealthStatus = 'starting' | 'healthy' | 'disabled' | 'degraded';

export type ReconcilerHealthReasonCode = 'bootstrap_failed' | 'runtime_unavailable';

export type ReadinessStatus = 'ready' | 'not_ready';

export type ReadinessReasonCode =
  | 'reconciler_starting'
  | 'reconciler_degraded'
  | 'database_not_configured'
  | 'database_unavailable'
  | 'adapter_not_configured'
  | 'adapter_unavailable';

export type HealthzPayload = {
  ok: true;
  status: OverallHealthStatus;
  components: {
    intentReconciler:
      | {
          status: Extract<ReconcilerHealthStatus, 'starting' | 'healthy' | 'disabled'>;
        }
      | {
          status: 'degraded';
          reasonCode: ReconcilerHealthReasonCode;
        };
  };
};

export type ReadyzPayload =
  | {
      ok: true;
      status: Extract<ReadinessStatus, 'ready'>;
    }
  | {
      ok: false;
      status: Extract<ReadinessStatus, 'not_ready'>;
      reasonCode: ReadinessReasonCode;
    };

export type VersionPayload = {
  name: string;
  version: string;
};

export type DbReadyPayload = {
  ok: boolean;
  reason?: string;
};

export type OptionalEndpointProbe<T> = {
  available: boolean;
  statusCode: number | null;
  data: T | null;
  error: string | null;
};

export type PlatformHealthSnapshot = {
  fetchedAt: string;
  apiBaseUrl: string;
  healthz: HealthzPayload;
  readyz: OptionalEndpointProbe<ReadyzPayload>;
  version: OptionalEndpointProbe<VersionPayload>;
  dbReady: OptionalEndpointProbe<DbReadyPayload>;
};
