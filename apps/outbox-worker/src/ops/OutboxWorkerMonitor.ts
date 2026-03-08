import type {
  OutboxFailureDisposition,
  OutboxRecord,
  OutboxTickResult,
  OutboxWorkerObserver,
} from '@dvt/engine';

import type { OutboxWorkerRuntimeHooks, OutboxWorkerRuntimeLogger } from '../runtime/OutboxWorkerRuntime.js';

export type OutboxRuntimeState = 'starting' | 'idle' | 'draining' | 'failing' | 'stopped';

export interface HealthSnapshot {
  ok: boolean;
  ready: boolean;
  state: OutboxRuntimeState;
  service: string;
  lastErrorMessage: string | null;
  lastErrorAt: string | null;
  lastTickAt: string | null;
}

interface OutboxWorkerMonitorOptions {
  serviceName: string;
  logger: OutboxWorkerRuntimeLogger;
  nowMs?: () => number;
}

interface Counters {
  claimedRecordsTotal: number;
  deliveredRecordsTotal: number;
  retriedRecordsTotal: number;
  deadLetteredRecordsTotal: number;
  runtimeErrorsTotal: number;
  ticksTotal: number;
}

const RUNTIME_STATES: readonly OutboxRuntimeState[] = [
  'starting',
  'idle',
  'draining',
  'failing',
  'stopped',
];

export class OutboxWorkerMonitor implements OutboxWorkerObserver, OutboxWorkerRuntimeHooks {
  private readonly serviceName: string;
  private readonly logger: OutboxWorkerRuntimeLogger;
  private readonly nowMs: () => number;

  private state: OutboxRuntimeState = 'starting';
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
  private lastClaimedLagSeconds = 0;
  private lastBatchClaimedCount = 0;

  constructor(options: OutboxWorkerMonitorOptions) {
    this.serviceName = options.serviceName;
    this.logger = options.logger;
    this.nowMs = options.nowMs ?? (() => Date.now());
  }

  onStarted(): void {
    if (this.startedAtMs === null) {
      this.startedAtMs = this.nowMs();
    }
    this.transitionTo('starting', 'runtime bootstrapped');
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
    this.transitionTo('stopped', 'runtime stopped');
  }

  onBatchClaimed(records: readonly OutboxRecord[]): void {
    const oldestRecord = records[0] ?? null;
    const oldestLagSeconds =
      oldestRecord === null ? 0 : roundToMillis(resolveLagSeconds(oldestRecord.createdAt, this.nowMs()));

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
    this.logger.info(toRecordLog(record), 'outbox record delivered');
  }

  onRecordFailed(
    record: OutboxRecord,
    error: string,
    disposition: OutboxFailureDisposition
  ): void {
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

  getHealthSnapshot(): HealthSnapshot {
    return {
      ok: this.state !== 'stopped',
      ready: this.state === 'idle' || this.state === 'draining',
      state: this.state,
      service: this.serviceName,
      lastErrorMessage: this.lastErrorMessage,
      lastErrorAt: toIso(this.lastErrorAtMs),
      lastTickAt: toIso(this.lastTickAtMs),
    };
  }

  renderMetrics(): string {
    const nowSeconds = Math.floor(this.nowMs() / 1000);
    const lines = [
      '# HELP dvt_outbox_runtime_up Whether the standalone outbox worker process is alive.',
      '# TYPE dvt_outbox_runtime_up gauge',
      `dvt_outbox_runtime_up ${this.state === 'stopped' ? 0 : 1}`,
      '# HELP dvt_outbox_runtime_ready Whether the worker is ready to drain outbox records.',
      '# TYPE dvt_outbox_runtime_ready gauge',
      `dvt_outbox_runtime_ready ${this.state === 'idle' || this.state === 'draining' ? 1 : 0}`,
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
      `dvt_outbox_process_start_timestamp_seconds ${this.startedAtMs === null ? nowSeconds : Math.floor(this.startedAtMs / 1000)}`,
    ];

    return `${lines.join('\n')}\n`;
  }

  private transitionTo(nextState: OutboxRuntimeState, reason: string): void {
    if (this.state === nextState) return;
    const previousState = this.state;
    this.state = nextState;
    this.logger.info({ from: previousState, to: nextState, reason }, 'outbox runtime state changed');
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
  return error instanceof Error ? error.message : String(error);
}

function resolveLagSeconds(createdAt: string, nowMs: number): number {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) return 0;
  return Math.max(0, (nowMs - createdAtMs) / 1000);
}

function roundToMillis(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function toIso(epochMs: number | null): string | null {
  return epochMs === null ? null : new Date(epochMs).toISOString();
}
