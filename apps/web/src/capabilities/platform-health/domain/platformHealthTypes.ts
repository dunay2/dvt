import type { DataSourceMode } from '../../../app/services/config/dataSource';

export type PlatformHealthStatus = 'healthy' | 'degraded';

export type PlatformIntentReconcilerStatus = 'starting' | 'healthy' | 'disabled' | 'degraded';

export type PlatformIntentReconcilerReason = 'bootstrap_failed' | 'runtime_unavailable';

export type PlatformReadinessStatus = 'ready' | 'not_ready';

export type PlatformReadinessReason =
  | 'reconciler_starting'
  | 'reconciler_degraded'
  | 'database_not_configured'
  | 'database_unavailable'
  | 'adapter_not_configured'
  | 'adapter_unavailable';

export type PlatformHealthInfo = {
  ok: true;
  status: PlatformHealthStatus;
  components: {
    intentReconciler:
      | {
          status: Extract<PlatformIntentReconcilerStatus, 'starting' | 'healthy' | 'disabled'>;
        }
      | {
          status: 'degraded';
          reasonCode: PlatformIntentReconcilerReason;
        };
  };
};

export type PlatformReadinessInfo =
  | {
      ok: true;
      status: Extract<PlatformReadinessStatus, 'ready'>;
    }
  | {
      ok: false;
      status: Extract<PlatformReadinessStatus, 'not_ready'>;
      reasonCode: PlatformReadinessReason;
    };

export type PlatformVersionInfo = {
  name: string;
  version: string;
};

export type PlatformDatabaseReadiness = {
  ok: boolean;
  reason: string | null;
};

export type PlatformEndpointFailureKind = 'network' | 'http' | 'invalid_json';

export type PlatformEndpointFailure = {
  kind: PlatformEndpointFailureKind;
  message: string;
  statusCode: number | null;
};

export type EndpointAvailability = 'available' | 'not_enabled';

export type OptionalEndpointProbe<TData> = {
  endpoint: string;
  availability: EndpointAvailability;
  statusCode: number | null;
  latencyMs: number | null;
  data: TData | null;
  error: PlatformEndpointFailure | null;
};

export type RequiredEndpointProbe<TData> = {
  endpoint: string;
  availability: 'available';
  statusCode: number;
  latencyMs: number;
  data: TData;
  error: null;
};

export type PlatformHealthSnapshot = {
  fetchedAt: string;
  apiBaseUrl: string;
  dataSourceMode: DataSourceMode;
  healthz: RequiredEndpointProbe<PlatformHealthInfo>;
  readyz: OptionalEndpointProbe<PlatformReadinessInfo>;
  version: OptionalEndpointProbe<PlatformVersionInfo>;
  dbReady: OptionalEndpointProbe<PlatformDatabaseReadiness>;
};

export type PlatformConnectionState = {
  rest: 'ok' | 'degraded' | 'offline';
  liveEvents: 'connected' | 'polling' | 'disconnected';
};
