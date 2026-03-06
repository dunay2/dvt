/**
 * @file packages/@dvt/engine/src/workers/IntentReconcilerWorker.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @decision Periodic reconciler with single-flight execution and infra-only backoff
 * @consequence Reconciliation keeps running across transient failures without overlapping sweeps
 * @version 1.0.0
 * @date 2026-03-05
 */
import type { IRunMaintenanceService } from '../ports/IRunMaintenanceService.js';
import type { IClock } from '../utils/clock.js';

export interface IntentReconcilerWorkerLogger {
  info(data: Record<string, unknown>): void;
  error(data: Record<string, unknown>): void;
}

export interface IntentReconcilerWorkerMetrics {
  increment(name: string, value?: number): void;
  timing(name: string, valueMs: number): void;
  gauge(name: string, value: number): void;
}

export interface IntentReconcilerWorkerOptions {
  intervalMs?: number;
  orphanThresholdMs?: number;
  limit?: number;
  errorBackoffMsBase?: number;
  errorBackoffMsMax?: number;
  jitterRatio?: number;
  tickTimeoutMs?: number;
}

export interface IntentReconcilerWorkerDeps {
  clock?: Pick<IClock, 'nowIsoUtc'>;
  random?: () => number;
}

const DEFAULT_OPTIONS: Required<IntentReconcilerWorkerOptions> = {
  intervalMs: 30_000,
  orphanThresholdMs: 300_000,
  limit: 50,
  errorBackoffMsBase: 1_000,
  errorBackoffMsMax: 60_000,
  jitterRatio: 0.2,
  tickTimeoutMs: 20_000,
};

export class IntentReconcilerWorker {
  private readonly options: Required<IntentReconcilerWorkerOptions>;
  private readonly clock: Pick<IClock, 'nowIsoUtc'>;
  private readonly random: () => number;
  private timeout: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> | null = null;
  private running = false;
  private consecutiveInfraErrors = 0;

  constructor(
    private readonly maintenance: IRunMaintenanceService,
    private readonly logger: IntentReconcilerWorkerLogger,
    private readonly metrics: IntentReconcilerWorkerMetrics,
    options: IntentReconcilerWorkerOptions = {},
    deps: IntentReconcilerWorkerDeps = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    // eslint-disable-next-line no-restricted-syntax -- Production fallback for non-test usage.
    this.clock = deps.clock ?? { nowIsoUtc: () => new Date().toISOString() };
    // eslint-disable-next-line no-restricted-properties -- Production fallback jitter source.
    this.random = deps.random ?? Math.random;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext(0);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.inFlight !== null) {
      await this.inFlight;
    }
  }

  private scheduleNext(delayMs: number): void {
    if (!this.running) return;
    this.timeout = setTimeout(() => {
      this.inFlight = this.tick().finally(() => {
        this.inFlight = null;
      });
    }, delayMs);
  }

  private async tick(): Promise<void> {
    const startedAt = this.nowMs();
    this.metrics.increment('dvt.intent.reconcile.sweeps_total', 1);
    try {
      const result = await this.withTimeout(
        this.maintenance.reconcileOrphanedIntents({
          thresholdMs: this.options.orphanThresholdMs,
          limit: this.options.limit,
        })
      );

      this.consecutiveInfraErrors = 0;
      this.metrics.increment('dvt.intent.reconcile.inspected_total', result.inspected);
      this.metrics.increment('dvt.intent.reconcile.expired_total', result.expired.length);
      this.metrics.increment('dvt.intent.reconcile.cancelled_total', result.cancelled.length);
      this.metrics.increment('dvt.intent.reconcile.cancelFailed_total', result.cancelFailed.length);
      this.metrics.timing('dvt.intent.reconcile.duration_ms', this.nowMs() - startedAt);
      this.logger.info({
        msg: 'Intent reconciliation sweep completed',
        intervalMs: this.options.intervalMs,
        thresholdMs: this.options.orphanThresholdMs,
        limit: this.options.limit,
        inspected: result.inspected,
        expired: result.expired.length,
        cancelled: result.cancelled.length,
        cancelFailed: result.cancelFailed.length,
      });
      this.scheduleNext(this.options.intervalMs);
    } catch (error: unknown) {
      this.metrics.increment('dvt.intent.reconcile.errors_total', 1);
      this.metrics.timing('dvt.intent.reconcile.duration_ms', this.nowMs() - startedAt);

      const isInfra = isInfrastructureError(error);
      const backoffMs = isInfra ? this.computeBackoffMs() : this.options.intervalMs;
      this.metrics.gauge('dvt.intent.reconcile.backoff_ms', backoffMs);

      this.logger.error({
        msg: 'Intent reconciliation sweep failed',
        errorClass: isInfra ? 'infrastructure' : 'logic',
        errorCode: extractErrorCode(error),
        errorMessage: extractErrorMessage(error),
        attempt: this.consecutiveInfraErrors,
        backoffMs,
      });
      this.scheduleNext(backoffMs);
    }
  }

  private async withTimeout<T>(operation: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    try {
      // If timeout wins the race, swallow late rejection from operation to avoid
      // unhandled rejection noise/crashes. Timeout does not cancel the operation;
      // side effects may still complete and become visible in later sweeps.
      operation.catch(() => {});
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error('TICK_TIMEOUT');
          (error as Error & { code?: string }).code = 'ETIMEDOUT';
          reject(error);
        }, this.options.tickTimeoutMs);
      });
      return await Promise.race([operation, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private computeBackoffMs(): number {
    this.consecutiveInfraErrors += 1;
    const exp = Math.min(this.consecutiveInfraErrors - 1, 10);
    const base = this.options.errorBackoffMsBase * 2 ** exp;
    const capped = Math.min(base, this.options.errorBackoffMsMax);
    const jitterSpan = Math.floor(capped * this.options.jitterRatio);
    const jitter = jitterSpan === 0 ? 0 : Math.floor(this.random() * (jitterSpan + 1));
    return capped + jitter;
  }

  private nowMs(): number {
    return Date.parse(this.clock.nowIsoUtc());
  }
}

const INFRA_ERROR_CODES = new Set(['57P01', '53300', '08006', 'ETIMEDOUT']);

function extractErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  return undefined;
}

function isInfrastructureError(error: unknown): boolean {
  const code = extractErrorCode(error);
  if (!code) {
    return error instanceof Error && /timeout|connection|network|socket/i.test(error.message);
  }
  return code.startsWith('ECONN') || INFRA_ERROR_CODES.has(code);
}

function isPrimitive(error: unknown): boolean {
  return typeof error === 'number' || typeof error === 'boolean' || typeof error === 'bigint';
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (isPrimitive(error)) {
    return String(error);
  }
  return 'Unknown error';
}
