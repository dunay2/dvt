export type BackpressureSnapshotSource = 'live' | 'cache' | 'fallback';

export interface BackpressureCapacitySnapshot {
  readonly pendingEventsCount: number;
  readonly outboxOldestAgeMs: number;
  readonly source: BackpressureSnapshotSource;
}

/**
 * Port for recording backpressure capacity gauges (queue depth, outbox lag).
 * Separate from AdmissionTelemetry (ISP): capacity reporting and decision recording
 * change for different reasons and have different callers.
 *
 * Intentionally synchronous - metric emission must never delay the request path.
 */
export interface IBackpressureCapacityTelemetry {
  recordSnapshot(snapshot: BackpressureCapacitySnapshot): void;
}
