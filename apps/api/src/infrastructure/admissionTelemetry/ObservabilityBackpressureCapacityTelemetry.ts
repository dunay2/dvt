import type { IObservability } from '@dvt/observability';

import type {
  BackpressureCapacitySnapshot,
  IBackpressureCapacityTelemetry,
} from '../../application/ports/IBackpressureCapacityTelemetry.js';

import { ADMISSION_TELEMETRY_METRICS } from './admissionTelemetryMetrics.js';
import { safeWarn } from './safeWarn.js';

export class ObservabilityBackpressureCapacityTelemetry implements IBackpressureCapacityTelemetry {
  private readonly pendingEventsGauge;
  private readonly outboxOldestAgeGauge;

  public constructor(
    private readonly deps: {
      readonly observability: IObservability;
    }
  ) {
    this.pendingEventsGauge = deps.observability.metrics.gauge(
      ADMISSION_TELEMETRY_METRICS.pendingEventsGauge
    );
    this.outboxOldestAgeGauge = deps.observability.metrics.gauge(
      ADMISSION_TELEMETRY_METRICS.outboxOldestAgeGauge
    );
  }

  public recordSnapshot(snapshot: BackpressureCapacitySnapshot): void {
    try {
      const labels = { source: snapshot.source };
      this.pendingEventsGauge.set(snapshot.pendingEventsCount, labels);
      this.outboxOldestAgeGauge.set(snapshot.outboxOldestAgeMs, labels);
    } catch (err) {
      safeWarn(this.deps.observability.logs, 'backpressure.capacity_telemetry_drop', err);
    }
  }
}
