export interface BackpressureCapacitySnapshot {
  readonly tenantId: string;
  readonly pendingEventsCount: number;
  readonly outboxOldestAgeMs: number;
  readonly source: 'live' | 'cache' | 'fallback';
}

export interface IBackpressureCapacityTelemetry {
  recordSnapshot(snapshot: BackpressureCapacitySnapshot): void;
}
