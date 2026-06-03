/**
 * Owned concern: emit bounded AR-C2 run-status freshness counters and logs.
 */
import type { Attributes, IObservability } from '@dvt/observability';

import type {
  IRunStatusStalenessTelemetry,
  RunSnapshotStaleness,
  SnapshotStalenessFallbackReason,
} from '../../application/ports/runtime.js';
import { safeWarn } from '../admissionTelemetry/safeWarn.js';

const RUN_STATUS_STALENESS_METRIC = {
  resultTotal: 'dvt.api.run_status.snapshot_staleness_result_total',
  fallbackUnknownTotal: 'dvt.api.run_status.snapshot_staleness_fallback_unknown_total',
} as const;

export class ObservabilityRunStatusStalenessTelemetry implements IRunStatusStalenessTelemetry {
  private readonly resultCounter;
  private readonly fallbackUnknownCounter;

  public constructor(
    private readonly deps: {
      readonly observability: IObservability;
    }
  ) {
    this.resultCounter = deps.observability.metrics.counter(
      RUN_STATUS_STALENESS_METRIC.resultTotal
    );
    this.fallbackUnknownCounter = deps.observability.metrics.counter(
      RUN_STATUS_STALENESS_METRIC.fallbackUnknownTotal
    );
  }

  public recordSnapshotStalenessResult(
    result: RunSnapshotStaleness,
    tenantId: string,
    runId: string
  ): void {
    try {
      this.resultCounter.add(1, { result });
      this.deps.observability.logs.info({
        msg: 'run_status.snapshot_staleness_result',
        attributes: {
          result,
          tenantId,
          runId,
        } as Attributes,
      });
    } catch (err) {
      safeWarn(this.deps.observability.logs, 'run_status.snapshot_staleness_telemetry_drop', err);
    }
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
