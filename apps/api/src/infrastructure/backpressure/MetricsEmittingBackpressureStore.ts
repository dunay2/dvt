import type { BackpressureStore } from '@dvt/delivery';

import type { IBackpressureCapacityTelemetry } from '../../application/ports/IBackpressureCapacityTelemetry.js';

import type { BackpressureSnapshotEnvelopeStore } from './types.js';

export class MetricsEmittingBackpressureStore implements BackpressureStore {
  public constructor(
    private readonly deps: {
      readonly delegate: BackpressureSnapshotEnvelopeStore;
      readonly capacityTelemetry: IBackpressureCapacityTelemetry;
    }
  ) {}

  public async getTenantSnapshot(tenantId: string) {
    const envelope = await this.deps.delegate.getTenantSnapshotEnvelope(tenantId);
    try {
      this.deps.capacityTelemetry.recordSnapshot({
        pendingEventsCount: envelope.snapshot.pendingEventsPerTenant,
        outboxOldestAgeMs: envelope.snapshot.outboxOldestAgeMs,
        source: envelope.source,
      });
    } catch {
      // Telemetry must not break admission. Intentionally silent: this class
      // depends only on IBackpressureCapacityTelemetry (ISP) and has no logger
      // reference. Errors here are observable via process-level metrics.
    }
    return envelope.snapshot;
  }
}
