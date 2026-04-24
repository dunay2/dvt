/**
 * Owned concern: translate backlog-capacity snapshots into bounded gauge
 * signals for admission observability.
 */
import type { IObservability } from '@dvt/observability';

import type { IBackpressureCapacityTelemetry } from '../../application/ports/IBackpressureCapacityTelemetry.js';

import { ADMISSION_TELEMETRY_METRICS } from './admissionTelemetryMetrics.js';

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

  public recordSnapshot(
    snapshot: Parameters<IBackpressureCapacityTelemetry['recordSnapshot']>[0]
  ): void {
    const labels = { source: snapshot.source };
    this.pendingEventsGauge.set(snapshot.pendingEventsCount, labels);
    this.outboxOldestAgeGauge.set(snapshot.outboxOldestAgeMs, labels);
  }
}
