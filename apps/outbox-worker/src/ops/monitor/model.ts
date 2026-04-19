export type OutboxRuntimeState =
  | 'starting'
  | 'passive'
  | 'idle'
  | 'draining'
  | 'stopping'
  | 'failing'
  | 'stopped';

export interface HealthSnapshot {
  ok: boolean;
  ready: boolean;
  state: OutboxRuntimeState;
  owner: boolean;
  service: string;
  lastErrorMessage: string | null;
  lastErrorAt: string | null;
  lastTickAt: string | null;
  tickFresh: boolean;
}

export interface DeliveryFailureSignal {
  errorAtMs: number | null;
  errorMessage: string | null;
}

export interface OutboxRuntimeMetricsSnapshot {
  state: OutboxRuntimeState;
  owner: boolean;
  ready: boolean;
  tickFresh: boolean;
  startedAtMs: number | null;
  lastTickAtMs: number | null;
  lastErrorAtMs: number | null;
  runtimeErrorsTotal: number;
}

export interface OutboxDeliveryMetricsSnapshot {
  claimedRecordsTotal: number;
  deliveredRecordsTotal: number;
  retriedRecordsTotal: number;
  deadLetteredRecordsTotal: number;
  ticksTotal: number;
  lastClaimedLagSeconds: number;
  lastBatchClaimedCount: number;
  eventDeliveryLatencyBucketCounts: number[];
  eventDeliveryLatencyCount: number;
  eventDeliveryLatencySumMs: number;
}

export interface OutboxRetentionMetricsSnapshot {
  retentionCyclesTotal: number;
  retentionCycleFailuresTotal: number;
  retentionArchivedUnitsTotal: number;
  retentionLastCycleDurationMs: number;
  retentionLastSuccessAtMs: number | null;
  retentionLastFailureAtMs: number | null;
}

export const DELIVERY_EVENT_LATENCY_BUCKETS_MS = [
  50,
  100,
  250,
  500,
  1000,
  2500,
  5000,
  10000,
] as const;

export const RUNTIME_STATES: readonly OutboxRuntimeState[] = [
  'starting',
  'passive',
  'idle',
  'draining',
  'stopping',
  'failing',
  'stopped',
];

export const DEFAULT_READY_STALE_AFTER_MS = 30_000;
