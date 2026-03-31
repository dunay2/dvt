export type OverallHealthStatusDto = 'healthy' | 'degraded';

export type ReconcilerHealthStatusDto = 'starting' | 'healthy' | 'disabled' | 'degraded';

export type ReconcilerHealthReasonCodeDto = 'bootstrap_failed' | 'runtime_unavailable';

export type ReadinessStatusDto = 'ready' | 'not_ready';

export type ReadinessReasonCodeDto =
  | 'reconciler_starting'
  | 'reconciler_degraded'
  | 'database_not_configured'
  | 'database_unavailable'
  | 'adapter_not_configured'
  | 'adapter_unavailable';

export type HealthzDto = {
  ok: true;
  status: OverallHealthStatusDto;
  components: {
    intentReconciler:
      | {
          status: Extract<ReconcilerHealthStatusDto, 'starting' | 'healthy' | 'disabled'>;
        }
      | {
          status: 'degraded';
          reasonCode: ReconcilerHealthReasonCodeDto;
        };
  };
};

export type ReadyzDto =
  | {
      ok: true;
      status: Extract<ReadinessStatusDto, 'ready'>;
    }
  | {
      ok: false;
      status: Extract<ReadinessStatusDto, 'not_ready'>;
      reasonCode: ReadinessReasonCodeDto;
    };

export type VersionDto = {
  name: string;
  version: string;
};

export type DbReadyDto = {
  ok: boolean;
  reason?: string;
};
