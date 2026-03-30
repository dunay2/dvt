import type { IObservability } from '@dvt/observability';

import type {
  IRunStatusStalenessTelemetry,
  SnapshotStalenessFallbackReason,
} from '../../application/ports/runtime.js';
import { safeWarn } from '../admissionTelemetry/safeWarn.js';

const RUN_STATUS_STALENESS_FALLBACK_UNKNOWN_TOTAL =
  'dvt.api.run_status.snapshot_staleness_fallback_unknown_total';

export class ObservabilityRunStatusStalenessTelemetry implements IRunStatusStalenessTelemetry {
  private readonly unknownCounter;

  public constructor(private readonly observability: IObservability) {
    this.unknownCounter = observability.metrics.counter(
      RUN_STATUS_STALENESS_FALLBACK_UNKNOWN_TOTAL
    );
  }

  public async reportUnknown(
    reason: SnapshotStalenessFallbackReason,
    context: { tenantId: string; runId: string }
  ): Promise<void> {
    try {
      this.unknownCounter.add(1, { reason });
      this.observability.logs.warn({
        msg: 'run_status.snapshot_staleness_unknown',
        attributes: {
          reason,
          tenantId: context.tenantId,
          runId: context.runId,
        },
      });
    } catch (error) {
      // Telemetry paths must not break read routes.
      safeWarn(this.observability.logs, 'run_status.snapshot_staleness_telemetry_drop', error);
    }
  }
}
