export interface BackpressureCapacitySnapshot {
  readonly tenantId: string;
  readonly pendingEventsCount: number;
  readonly outboxOldestAgeMs: number;
  readonly source: 'live' | 'cache' | 'fallback';
}

/**
 * Port for recording backpressure capacity gauges (queue depth, outbox lag).
 * Separate from AdmissionTelemetry (ISP): capacity reporting and decision recording
 * change for different reasons and have different callers.
 *
 * Intentionally synchronous — metric emission must never delay the request path.
 */
export interface IBackpressureCapacityTelemetry {
  recordSnapshot(snapshot: BackpressureCapacitySnapshot): void;
}
