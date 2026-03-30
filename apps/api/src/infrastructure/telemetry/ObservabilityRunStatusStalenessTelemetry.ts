import type { Attributes, IObservability } from '@dvt/observability';

import type {
  IRunStatusStalenessTelemetry,
  SnapshotStalenessFallbackReason,
} from '../../application/ports/runtime.js';
import { safeWarn } from '../admissionTelemetry/safeWarn.js';

const RUN_STATUS_STALENESS_METRIC = {
  fallbackUnknownTotal: 'dvt.api.run_status.snapshot_staleness_fallback_unknown_total',
} as const;

export class ObservabilityRunStatusStalenessTelemetry implements IRunStatusStalenessTelemetry {
  private readonly fallbackUnknownCounter;

  public constructor(
    private readonly deps: {
      readonly observability: IObservability;
    }
  ) {
    this.fallbackUnknownCounter = deps.observability.metrics.counter(
      RUN_STATUS_STALENESS_METRIC.fallbackUnknownTotal
    );
  }

  public recordSnapshotStalenessFallback(
    reason: SnapshotStalenessFallbackReason,
    tenantId: string,
    runId: string
  ): void {
    try {
      this.fallbackUnknownCounter.add(1, {
        reason,
      });
      this.deps.observability.logs.warn({
        msg: 'run_status.snapshot_staleness_fallback_unknown',
        attributes: {
          reason,
          tenantId,
          runId,
        } as Attributes,
      });
    } catch (err) {
      safeWarn(this.deps.observability.logs, 'run_status.snapshot_staleness_telemetry_drop', err);
    }
  }
}
