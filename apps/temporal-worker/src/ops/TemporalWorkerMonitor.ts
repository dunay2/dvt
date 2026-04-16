import type { Logger } from 'pino';
import type { RunStateCommandCircuitSnapshot } from '@dvt/adapter-temporal';

export type TemporalWorkerRuntimeState = 'starting' | 'running' | 'stopping' | 'failing' | 'stopped';

export interface TemporalWorkerHealthSnapshot {
  ok: boolean;
  ready: boolean;
  state: TemporalWorkerRuntimeState;
  service: string;
  dbtEnabled: boolean;
  lastErrorMessage: string | null;
  lastErrorAt: string | null;
  startedAt: string | null;
  runStateCircuitState: RunStateCommandCircuitSnapshot['state'] | null;
}

interface TemporalWorkerMonitorOptions {
  serviceName: string;
  logger: Pick<Logger, 'info' | 'error'>;
  dbtEnabled: boolean;
  nowMs?: () => number;
}

const STATES: readonly TemporalWorkerRuntimeState[] = [
  'starting',
  'running',
  'stopping',
  'failing',
  'stopped',
];

export class TemporalWorkerMonitor {
  private readonly serviceName: string;
  private readonly logger: Pick<Logger, 'info' | 'error'>;
  private readonly dbtEnabled: boolean;
  private readonly nowMs: () => number;

  private state: TemporalWorkerRuntimeState = 'starting';
  private startedAtMs: number | null = null;
  private lastErrorMessage: string | null = null;
  private lastErrorAtMs: number | null = null;
  private startCount = 0;
  private stopCount = 0;
  private errorCount = 0;
  private runStateCircuitSnapshotProvider: (() => RunStateCommandCircuitSnapshot) | null = null;

  public constructor(options: TemporalWorkerMonitorOptions) {
    this.serviceName = options.serviceName;
    this.logger = options.logger;
    this.dbtEnabled = options.dbtEnabled;
    this.nowMs = options.nowMs ?? (() => Date.now());
  }

  public onStarting(): void {
    this.startedAtMs ??= this.nowMs();
    this.transitionTo('starting', 'worker bootstrap started');
  }

  public onStarted(): void {
    this.startCount += 1;
    this.lastErrorMessage = null;
    this.lastErrorAtMs = null;
    this.transitionTo('running', 'worker runtime started');
  }

  public onStopping(): void {
    this.transitionTo('stopping', 'worker shutdown requested');
  }

  public onStopped(): void {
    this.stopCount += 1;
    this.transitionTo('stopped', 'worker runtime stopped');
  }

  public onError(error: unknown): void {
    this.errorCount += 1;
    this.lastErrorMessage = toErrorMessage(error);
    this.lastErrorAtMs = this.nowMs();
    this.transitionTo('failing', 'worker runtime error observed');
  }

  public getHealthSnapshot(): TemporalWorkerHealthSnapshot {
    const runStateCircuitSnapshot = this.getRunStateCircuitSnapshot();
    return {
      ok: this.state !== 'stopped',
      ready: this.state === 'running',
      state: this.state,
      service: this.serviceName,
      dbtEnabled: this.dbtEnabled,
      lastErrorMessage: this.lastErrorMessage,
      lastErrorAt: toIso(this.lastErrorAtMs),
      startedAt: toIso(this.startedAtMs),
      runStateCircuitState: runStateCircuitSnapshot?.state ?? null,
    };
  }

  public setRunStateCircuitSnapshotProvider(
    provider: (() => RunStateCommandCircuitSnapshot) | null
  ): void {
    this.runStateCircuitSnapshotProvider = provider;
  }

  public renderMetrics(): string {
    const snapshot = this.getHealthSnapshot();
    const runStateCircuitSnapshot = this.getRunStateCircuitSnapshot();
    const runStateCircuitState = runStateCircuitSnapshot?.state ?? 'closed';
    const lines = [
      '# HELP dvt_temporal_worker_up Whether the standalone temporal worker process is alive.',
      '# TYPE dvt_temporal_worker_up gauge',
      `dvt_temporal_worker_up ${snapshot.ok ? 1 : 0}`,
      '# HELP dvt_temporal_worker_ready Whether the worker is ready to poll Temporal.',
      '# TYPE dvt_temporal_worker_ready gauge',
      `dvt_temporal_worker_ready ${snapshot.ready ? 1 : 0}`,
      '# HELP dvt_temporal_worker_dbt_enabled Whether DBT runtime support is enabled for this worker.',
      '# TYPE dvt_temporal_worker_dbt_enabled gauge',
      `dvt_temporal_worker_dbt_enabled ${this.dbtEnabled ? 1 : 0}`,
      '# HELP dvt_temporal_worker_state Worker runtime state as a labelled gauge.',
      '# TYPE dvt_temporal_worker_state gauge',
      ...STATES.map(
        (state) => `dvt_temporal_worker_state{state="${state}"} ${this.state === state ? 1 : 0}`
      ),
      '# HELP dvt_temporal_worker_start_total Number of successful runtime starts.',
      '# TYPE dvt_temporal_worker_start_total counter',
      `dvt_temporal_worker_start_total ${this.startCount}`,
      '# HELP dvt_temporal_worker_stop_total Number of runtime shutdown completions.',
      '# TYPE dvt_temporal_worker_stop_total counter',
      `dvt_temporal_worker_stop_total ${this.stopCount}`,
      '# HELP dvt_temporal_worker_error_total Number of runtime failures observed.',
      '# TYPE dvt_temporal_worker_error_total counter',
      `dvt_temporal_worker_error_total ${this.errorCount}`,
      '# HELP dvt_temporal_worker_started_timestamp_seconds Unix timestamp when the worker bootstrapped.',
      '# TYPE dvt_temporal_worker_started_timestamp_seconds gauge',
      `dvt_temporal_worker_started_timestamp_seconds ${this.startedAtMs === null ? 0 : Math.floor(this.startedAtMs / 1000)}`,
      '# HELP dvt_temporal_worker_last_error_timestamp_seconds Unix timestamp of the last runtime error.',
      '# TYPE dvt_temporal_worker_last_error_timestamp_seconds gauge',
      `dvt_temporal_worker_last_error_timestamp_seconds ${this.lastErrorAtMs === null ? 0 : Math.floor(this.lastErrorAtMs / 1000)}`,
      '# HELP dvt_temporal_worker_run_state_circuit_state Run-state command circuit state.',
      '# TYPE dvt_temporal_worker_run_state_circuit_state gauge',
      `dvt_temporal_worker_run_state_circuit_state{state="closed"} ${runStateCircuitState === 'closed' ? 1 : 0}`,
      `dvt_temporal_worker_run_state_circuit_state{state="open"} ${runStateCircuitState === 'open' ? 1 : 0}`,
      `dvt_temporal_worker_run_state_circuit_state{state="half_open"} ${runStateCircuitState === 'half_open' ? 1 : 0}`,
      '# HELP dvt_temporal_worker_run_state_circuit_trip_total Number of circuit trips.',
      '# TYPE dvt_temporal_worker_run_state_circuit_trip_total counter',
      `dvt_temporal_worker_run_state_circuit_trip_total ${runStateCircuitSnapshot?.tripCount ?? 0}`,
      '# HELP dvt_temporal_worker_run_state_circuit_rejection_total Number of fast-fail rejections while circuit is open.',
      '# TYPE dvt_temporal_worker_run_state_circuit_rejection_total counter',
      `dvt_temporal_worker_run_state_circuit_rejection_total ${runStateCircuitSnapshot?.rejectionCount ?? 0}`,
      '# HELP dvt_temporal_worker_run_state_circuit_failure_total Number of guarded state-store failures observed by the breaker.',
      '# TYPE dvt_temporal_worker_run_state_circuit_failure_total counter',
      `dvt_temporal_worker_run_state_circuit_failure_total ${runStateCircuitSnapshot?.failureCount ?? 0}`,
      '# HELP dvt_temporal_worker_run_state_circuit_timeout_total Number of state-store timeouts observed by the breaker.',
      '# TYPE dvt_temporal_worker_run_state_circuit_timeout_total counter',
      `dvt_temporal_worker_run_state_circuit_timeout_total ${runStateCircuitSnapshot?.timeoutCount ?? 0}`,
      '# HELP dvt_temporal_worker_run_state_circuit_half_open_probe_total Number of half-open probe attempts.',
      '# TYPE dvt_temporal_worker_run_state_circuit_half_open_probe_total counter',
      `dvt_temporal_worker_run_state_circuit_half_open_probe_total ${runStateCircuitSnapshot?.halfOpenProbeCount ?? 0}`,
    ];

    return `${lines.join('\n')}\n`;
  }

  private getRunStateCircuitSnapshot(): RunStateCommandCircuitSnapshot | null {
    return this.runStateCircuitSnapshotProvider?.() ?? null;
  }

  private transitionTo(nextState: TemporalWorkerRuntimeState, reason: string): void {
    if (this.state === nextState) {
      return;
    }

    const previousState = this.state;
    this.state = nextState;
    this.logger.info({ from: previousState, to: nextState, reason }, 'temporal worker state changed');
  }
}

function toIso(epochMs: number | null): string | null {
  return epochMs === null ? null : new Date(epochMs).toISOString();
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error === null) {
    return 'null';
  }
  if (typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'UnserializableErrorObject';
    }
  }
  return String(error);
}
