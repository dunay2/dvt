export type BackpressureSnapshotSource = 'live' | 'cache' | 'fallback';

export interface BackpressureCapacitySnapshot {
  readonly pendingEventsCount: number;
  readonly outboxOldestAgeMs: number;
  readonly source: BackpressureSnapshotSource;
}

export interface IBackpressureCapacityTelemetry {
  recordSnapshot(snapshot: BackpressureCapacitySnapshot): void;
}
