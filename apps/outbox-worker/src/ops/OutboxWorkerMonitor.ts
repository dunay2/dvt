import type {
  OutboxFailureDisposition,
  OutboxRecord,
  OutboxTickResult,
  OutboxWorkerObserver,
} from '@dvt/contracts';

import type {
  OutboxWorkerRuntimeHooks,
  OutboxWorkerRuntimeLogger,
} from '../runtime/OutboxWorkerRuntime.js';
import type { RunEventRetentionRuntimeHooks } from '../runtime/RunEventRetentionRuntime.js';

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

interface OutboxWorkerMonitorOptions {
  serviceName: string;
  logger: OutboxWorkerRuntimeLogger;
  nowMs?: () => number;
  readyStaleAfterMs?: number;
}

interface Counters {
  claimedRecordsTotal: number;
  deliveredRecordsTotal: number;
  retriedRecordsTotal: number;
  deadLetteredRecordsTotal: number;
  runtimeErrorsTotal: number;
  ticksTotal: number;
}

const DELIVERY_EVENT_LATENCY_BUCKETS_MS = [50, 100, 250, 500, 1000, 2500, 5000, 10000] as const;

const RUNTIME_STATES: readonly OutboxRuntimeState[] = [
  'starting',
  'passive',
  'idle',
  'draining',
  'stopping',
  'failing',
  'stopped',
];

const DEFAULT_READY_STALE_AFTER_MS = 30_000;

export class OutboxWorkerMonitor
  implements OutboxWorkerObserver, OutboxWorkerRuntimeHooks, RunEventRetentionRuntimeHooks
{
  private readonly serviceName: string;
  private readonly logger: OutboxWorkerRuntimeLogger;
  private readonly nowMs: () => number;
  private readonly readyStaleAfterMs: number;

  private state: OutboxRuntimeState = 'starting';
  private owner = false;
  private readonly counters: Counters = {
    claimedRecordsTotal: 0,
    deliveredRecordsTotal: 0,
    retriedRecordsTotal: 0,
    deadLetteredRecordsTotal: 0,
    runtimeErrorsTotal: 0,
    ticksTotal: 0,
  };
  private startedAtMs: number | null = null;
  private lastTickAtMs: number | null = null;
  private lastErrorAtMs: number | null = null;
  private lastErrorMessage: string | null = null;
  private pendingDeliveryFailureAtMs: number | null = null;
  private pendingDeliveryFailureMessage: string | null = null;
  private lastClaimedLagSeconds = 0;
  private lastBatchClaimedCount = 0;
  private retentionCyclesTotal = 0;
  private retentionCycleFailuresTotal = 0;
  private retentionArchivedUnitsTotal = 0;
  private retentionLastCycleDurationMs = 0;
  private retentionLastSuccessAtMs: number | null = null;
  private retentionLastFailureAtMs: number | null = null;
  private readonly claimedAtByRecordId = new Map<string, number>();
  private readonly eventDeliveryLatencyBucketCounts = DELIVERY_EVENT_LATENCY_BUCKETS_MS.map(
    () => 0
  );
  private eventDeliveryLatencyCount = 0;
  private eventDeliveryLatencySumMs = 0;

  constructor(options: OutboxWorkerMonitorOptions) {
    this.serviceName = options.serviceName;
    this.logger = options.logger;
    this.nowMs = options.nowMs ?? (() => Date.now());
    this.readyStaleAfterMs = options.readyStaleAfterMs ?? DEFAULT_READY_STALE_AFTER_MS;
  }

  onStarted(): void {
    this.owner = true;
    this.startedAtMs ??= this.nowMs();
    this.transitionTo('starting', 'runtime bootstrapped');
  }

  onOwnershipAcquired(): void {
    this.owner = true;
  }

  onOwnershipLost(error?: unknown): void {
    this.owner = false;
    this.lastErrorMessage = error ? toErrorMessage(error) : 'outbox ownership lost';
    this.lastErrorAtMs = this.nowMs();
    this.transitionTo('failing', 'ownership lost');
  }

  onTick(result: OutboxTickResult): void {
    this.counters.ticksTotal += 1;
    this.counters.claimedRecordsTotal += result.claimedCount;
    this.counters.deliveredRecordsTotal += result.deliveredCount;
    this.counters.retriedRecordsTotal += result.retriedCount;
    this.counters.deadLetteredRecordsTotal += result.deadLetteredCount;
    this.lastTickAtMs = this.nowMs();
    this.lastClaimedLagSeconds =
      result.oldestClaimedAgeMs === null ? 0 : roundToMillis(result.oldestClaimedAgeMs / 1000);
    this.lastBatchClaimedCount = result.claimedCount;
    const lastDeliveryFailureMessage = this.pendingDeliveryFailureMessage;
    const lastDeliveryFailureAtMs = this.pendingDeliveryFailureAtMs;
    this.pendingDeliveryFailureMessage = null;
    this.pendingDeliveryFailureAtMs = null;
    const hadDeliveryFailures = result.retriedCount > 0 || result.deadLetteredCount > 0;

    if (hadDeliveryFailures) {
      this.lastErrorMessage =
        lastDeliveryFailureMessage ?? this.lastErrorMessage ?? 'outbox delivery failed';
      this.lastErrorAtMs = lastDeliveryFailureAtMs ?? this.lastErrorAtMs ?? this.lastTickAtMs;
      this.transitionTo('failing', 'tick completed with delivery failures');
      return;
    }

    if (result.retryBacklogActive) {
      this.transitionTo('failing', 'retry backlog still pending');
      return;
    }

    this.lastErrorMessage = null;
    this.lastErrorAtMs = null;
    this.transitionTo(result.claimedCount > 0 ? 'draining' : 'idle', 'tick completed');
  }

  onError(error: unknown): void {
    this.counters.runtimeErrorsTotal += 1;
    this.lastErrorMessage = toErrorMessage(error);
    this.lastErrorAtMs = this.nowMs();
    this.transitionTo('failing', 'runtime error observed');
  }

  onStopped(): void {
    this.owner = false;
    this.claimedAtByRecordId.clear();
    this.transitionTo('stopped', 'runtime stopped');
  }

  onStopping(): void {
    this.transitionTo('stopping', 'shutdown requested');
  }

  enterPassiveMode(): void {
    this.owner = false;
    this.startedAtMs ??= this.nowMs();
    this.lastErrorMessage = null;
    this.lastErrorAtMs = null;
    this.transitionTo('passive', 'runtime ownership is passive');
  }

  onBatchClaimed(records: readonly OutboxRecord[]): void {
    const claimedAtMs = this.nowMs();
    for (const record of records) {
      this.claimedAtByRecordId.set(record.id, claimedAtMs);
    }

    const oldestRecord = resolveOldestRecord(records);
    const oldestLagSeconds =
      oldestRecord === null
        ? 0
        : roundToMillis(resolveLagSeconds(oldestRecord.createdAt, this.nowMs()));

    this.logger.info(
      {
        claimedCount: records.length,
        oldestCreatedAt: oldestRecord?.createdAt,
        oldestLagSeconds,
      },
      'outbox records claimed'
    );
  }

  onRecordDelivered(record: OutboxRecord): void {
    this.observeEventDeliveryLatency(record.id);
    this.logger.info(toRecordLog(record), 'outbox record delivered');
  }

  onRecordFailed(record: OutboxRecord, error: string, disposition: OutboxFailureDisposition): void {
    this.observeEventDeliveryLatency(record.id);
    this.pendingDeliveryFailureMessage = error;
    this.pendingDeliveryFailureAtMs = this.nowMs();
    const data = {
      ...toRecordLog(record),
      error,
      attemptsAfterFailure: record.attempts + 1,
      disposition,
    };

    if (disposition === 'dead_letter') {
      this.logger.error(data, 'outbox record dead-lettered');
      return;
    }

    this.logger.warn?.(data, 'outbox record scheduled for retry');
  }

  onRunEventRetentionCycleSucceeded(details: { durationMs: number; archivedUnits: number }): void {
    this.retentionCyclesTotal += 1;
    this.retentionArchivedUnitsTotal += details.archivedUnits;
    this.retentionLastCycleDurationMs = Math.max(0, details.durationMs);
    this.retentionLastSuccessAtMs = this.nowMs();
  }

  onRunEventRetentionCycleFailed(details: { durationMs: number; error: unknown }): void {
    this.retentionCyclesTotal += 1;
    this.retentionCycleFailuresTotal += 1;
    this.retentionLastCycleDurationMs = Math.max(0, details.durationMs);
    this.retentionLastFailureAtMs = this.nowMs();
    void details.error;
  }

  getHealthSnapshot(): HealthSnapshot {
    const tickFresh = this.isTickFresh();
    return {
      ok: this.state !== 'stopped',
      ready: this.isReadyState() && tickFresh,
      state: this.state,
      owner: this.owner,
      service: this.serviceName,
      lastErrorMessage: this.lastErrorMessage,
      lastErrorAt: toIso(this.lastErrorAtMs),
      lastTickAt: toIso(this.lastTickAtMs),
      tickFresh,
    };
  }

  renderMetrics(): string {
    const ready = this.isReadyState() && this.isTickFresh();
    const lines = [
      '# HELP dvt_outbox_runtime_up Whether the standalone outbox worker process is alive.',
      '# TYPE dvt_outbox_runtime_up gauge',
      `dvt_outbox_runtime_up ${this.state === 'stopped' ? 0 : 1}`,
      '# HELP dvt_outbox_runtime_ready Whether the worker is ready to drain outbox records.',
      '# TYPE dvt_outbox_runtime_ready gauge',
      `dvt_outbox_runtime_ready ${ready ? 1 : 0}`,
      '# HELP dvt_outbox_runtime_owner Whether this process currently owns active outbox draining.',
      '# TYPE dvt_outbox_runtime_owner gauge',
      `dvt_outbox_runtime_owner ${this.owner ? 1 : 0}`,
      '# HELP dvt_outbox_runtime_tick_fresh Whether the last completed tick is fresh enough for readiness.',
      '# TYPE dvt_outbox_runtime_tick_fresh gauge',
      `dvt_outbox_runtime_tick_fresh ${this.isTickFresh() ? 1 : 0}`,
      '# HELP dvt_outbox_runtime_state Worker runtime state as a labelled gauge.',
      '# TYPE dvt_outbox_runtime_state gauge',
      ...RUNTIME_STATES.map(
        (state) => `dvt_outbox_runtime_state{state="${state}"} ${this.state === state ? 1 : 0}`
      ),
      '# HELP dvt_outbox_claimed_records_total Total claimed outbox records.',
      '# TYPE dvt_outbox_claimed_records_total counter',
      `dvt_outbox_claimed_records_total ${this.counters.claimedRecordsTotal}`,
      '# HELP dvt_outbox_delivered_records_total Total delivered outbox records.',
      '# TYPE dvt_outbox_delivered_records_total counter',
      `dvt_outbox_delivered_records_total ${this.counters.deliveredRecordsTotal}`,
      '# HELP dvt_outbox_retried_records_total Total outbox records scheduled for retry.',
      '# TYPE dvt_outbox_retried_records_total counter',
      `dvt_outbox_retried_records_total ${this.counters.retriedRecordsTotal}`,
      '# HELP dvt_outbox_dead_lettered_records_total Total outbox records moved to DLQ.',
      '# TYPE dvt_outbox_dead_lettered_records_total counter',
      `dvt_outbox_dead_lettered_records_total ${this.counters.deadLetteredRecordsTotal}`,
      '# HELP dvt_outbox_runtime_errors_total Total runtime loop errors.',
      '# TYPE dvt_outbox_runtime_errors_total counter',
      `dvt_outbox_runtime_errors_total ${this.counters.runtimeErrorsTotal}`,
      '# HELP dvt_outbox_oldest_claimed_lag_seconds Age of the oldest record in the last claimed batch.',
      '# TYPE dvt_outbox_oldest_claimed_lag_seconds gauge',
      `dvt_outbox_oldest_claimed_lag_seconds ${this.lastClaimedLagSeconds}`,
      '# HELP dvt_delivery_outbox_drain_lag_seconds Age of the oldest record in the last claimed batch (canonical delivery alias).',
      '# TYPE dvt_delivery_outbox_drain_lag_seconds gauge',
      `dvt_delivery_outbox_drain_lag_seconds ${this.lastClaimedLagSeconds}`,
      '# HELP dvt_outbox_last_claimed_batch_size Number of records claimed in the last completed tick.',
      '# TYPE dvt_outbox_last_claimed_batch_size gauge',
      `dvt_outbox_last_claimed_batch_size ${this.lastBatchClaimedCount}`,
      '# HELP dvt_outbox_last_tick_timestamp_seconds Unix timestamp of the last completed tick.',
      '# TYPE dvt_outbox_last_tick_timestamp_seconds gauge',
      `dvt_outbox_last_tick_timestamp_seconds ${this.lastTickAtMs === null ? 0 : Math.floor(this.lastTickAtMs / 1000)}`,
      '# HELP dvt_outbox_last_error_timestamp_seconds Unix timestamp of the last runtime error.',
      '# TYPE dvt_outbox_last_error_timestamp_seconds gauge',
      `dvt_outbox_last_error_timestamp_seconds ${this.lastErrorAtMs === null ? 0 : Math.floor(this.lastErrorAtMs / 1000)}`,
      '# HELP dvt_outbox_process_start_timestamp_seconds Unix timestamp when the worker started.',
      '# TYPE dvt_outbox_process_start_timestamp_seconds gauge',
      `dvt_outbox_process_start_timestamp_seconds ${this.startedAtMs === null ? 0 : Math.floor(this.startedAtMs / 1000)}`,
      '# HELP dvt_run_event_retention_cycles_total Total run-event retention cycles executed.',
      '# TYPE dvt_run_event_retention_cycles_total counter',
      `dvt_run_event_retention_cycles_total ${this.retentionCyclesTotal}`,
      '# HELP dvt_run_event_retention_cycle_failures_total Total failed run-event retention cycles.',
      '# TYPE dvt_run_event_retention_cycle_failures_total counter',
      `dvt_run_event_retention_cycle_failures_total ${this.retentionCycleFailuresTotal}`,
      '# HELP dvt_run_event_retention_archived_units_total Total archive units exported successfully by retention cycles.',
      '# TYPE dvt_run_event_retention_archived_units_total counter',
      `dvt_run_event_retention_archived_units_total ${this.retentionArchivedUnitsTotal}`,
      '# HELP dvt_run_event_retention_last_cycle_duration_ms Duration of the last retention cycle.',
      '# TYPE dvt_run_event_retention_last_cycle_duration_ms gauge',
      `dvt_run_event_retention_last_cycle_duration_ms ${this.retentionLastCycleDurationMs}`,
      '# HELP dvt_run_event_retention_last_success_timestamp_seconds Unix timestamp of the last successful retention cycle.',
      '# TYPE dvt_run_event_retention_last_success_timestamp_seconds gauge',
      `dvt_run_event_retention_last_success_timestamp_seconds ${this.retentionLastSuccessAtMs === null ? 0 : Math.floor(this.retentionLastSuccessAtMs / 1000)}`,
      '# HELP dvt_run_event_retention_last_failure_timestamp_seconds Unix timestamp of the last failed retention cycle.',
      '# TYPE dvt_run_event_retention_last_failure_timestamp_seconds gauge',
      `dvt_run_event_retention_last_failure_timestamp_seconds ${this.retentionLastFailureAtMs === null ? 0 : Math.floor(this.retentionLastFailureAtMs / 1000)}`,
      '# HELP dvt_delivery_event_delivery_latency_ms End-to-end delivery attempt latency from claim to delivered/failed observer callback.',
      '# TYPE dvt_delivery_event_delivery_latency_ms histogram',
      ...DELIVERY_EVENT_LATENCY_BUCKETS_MS.map(
        (le, index) =>
          `dvt_delivery_event_delivery_latency_ms_bucket{le="${le}"} ${this.eventDeliveryLatencyBucketCounts[index]}`
      ),
      `dvt_delivery_event_delivery_latency_ms_bucket{le="+Inf"} ${this.eventDeliveryLatencyCount}`,
      `dvt_delivery_event_delivery_latency_ms_sum ${roundToMillis(this.eventDeliveryLatencySumMs)}`,
      `dvt_delivery_event_delivery_latency_ms_count ${this.eventDeliveryLatencyCount}`,
    ];

    return `${lines.join('\n')}\n`;
  }

  private transitionTo(nextState: OutboxRuntimeState, reason: string): void {
    if (this.state === nextState) return;
    const previousState = this.state;
    this.state = nextState;
    this.logger.info(
      { from: previousState, to: nextState, reason },
      'outbox runtime state changed'
    );
  }

  private isReadyState(): boolean {
    return this.state === 'idle' || this.state === 'draining';
  }

  private isTickFresh(): boolean {
    if (this.lastTickAtMs === null) {
      return false;
    }

    return this.nowMs() - this.lastTickAtMs <= this.readyStaleAfterMs;
  }

  private observeEventDeliveryLatency(recordId: string): void {
    const claimedAtMs = this.claimedAtByRecordId.get(recordId);
    if (claimedAtMs === undefined) {
      return;
    }

    this.claimedAtByRecordId.delete(recordId);
    const elapsedMs = Math.max(0, this.nowMs() - claimedAtMs);
    this.eventDeliveryLatencyCount += 1;
    this.eventDeliveryLatencySumMs += elapsedMs;
    for (const [index, bucketUpperBound] of DELIVERY_EVENT_LATENCY_BUCKETS_MS.entries()) {
      if (elapsedMs <= bucketUpperBound) {
        const bucketCount = this.eventDeliveryLatencyBucketCounts[index] ?? 0;
        this.eventDeliveryLatencyBucketCounts[index] = bucketCount + 1;
      }
    }
  }
}

function toRecordLog(record: OutboxRecord): Record<string, unknown> {
  return {
    outboxId: record.id,
    runId: record.payload.runId,
    runSeq: record.payload.runSeq,
    eventType: record.payload.eventType,
    attempts: record.attempts,
    createdAt: record.createdAt,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error === null) return 'null';
  if (typeof error === 'object') return stringifyObjectError(error);
  return stringifyScalarError(error);
}

function stringifyScalarError(error: unknown): string {
  switch (typeof error) {
    case 'string':
      return error;
    case 'symbol':
      return error.description ?? error.toString();
    case 'function':
      return error.name ? `[function ${error.name}]` : '[function anonymous]';
    default:
      return `${error}`;
  }
}

function stringifyObjectError(error: object): string {
  const serialized = safeSerializeObject(error);
  if (serialized !== null) {
    return serialized;
  }

  const constructorName = error.constructor?.name;
  return constructorName && constructorName !== 'Object'
    ? constructorName
    : 'UnserializableErrorObject';
}

function safeSerializeObject(value: object): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function resolveLagSeconds(createdAt: string, nowMs: number): number {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return 0;
  return Math.max(0, (nowMs - createdAtMs) / 1000);
}

function resolveOldestRecord(records: readonly OutboxRecord[]): OutboxRecord | null {
  let oldestRecord: OutboxRecord | null = null;
  let oldestCreatedAtMs = Number.POSITIVE_INFINITY;

  for (const record of records) {
    const createdAtMs = Date.parse(record.createdAt);
    if (Number.isFinite(createdAtMs) && createdAtMs < oldestCreatedAtMs) {
      oldestCreatedAtMs = createdAtMs;
      oldestRecord = record;
    }
  }

  return oldestRecord ?? records[0] ?? null;
}

function roundToMillis(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function toIso(epochMs: number | null): string | null {
  return epochMs === null ? null : new Date(epochMs).toISOString();
}
