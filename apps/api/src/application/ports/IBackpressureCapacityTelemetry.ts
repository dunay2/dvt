/**
 * Owned concern: define the backlog-snapshot telemetry port used by start-run
 * admission observability without leaking metric-sink details.
 */
export type BackpressureSnapshotSource = 'live' | 'cache' | 'fallback';

export interface BackpressureCapacitySnapshot {
  readonly tenantId: string;
  readonly pendingEventsCount: number;
  readonly outboxOldestAgeMs: number;
  readonly source: BackpressureSnapshotSource;
}

export interface IBackpressureCapacityTelemetry {
  recordSnapshot(snapshot: BackpressureCapacitySnapshot): void;
}
