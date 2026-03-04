export interface ReconcileResult {
  inspected: number;
  expired: string[];
  cancelled: string[];
  cancelFailed: string[];
}

export interface ReconcileService {
  reconcileOrphanedIntents(options: {
    thresholdMs: number;
    limit: number;
  }): Promise<ReconcileResult>;
}

export interface ReconcilerLogger {
  info(data: Record<string, unknown>): void;
  warn(data: Record<string, unknown>): void;
  error(data: Record<string, unknown>): void;
}

export interface ReconcilerMetrics {
  increment(name: string, value?: number): void;
  timing(name: string, valueMs: number): void;
  gauge(name: string, value: number): void;
}

export interface IntentReconcilerOptions {
  intervalMs?: number;
  orphanThresholdMs?: number;
  limit?: number;
  errorBackoffMsBase?: number;
  errorBackoffMsMax?: number;
  jitterRatio?: number;
}

const DEFAULT_OPTIONS: Required<IntentReconcilerOptions> = {
  intervalMs: 30_000,
  orphanThresholdMs: 300_000,
  limit: 50,
  errorBackoffMsBase: 1_000,
  errorBackoffMsMax: 60_000,
  jitterRatio: 0.2,
};

/**
 * Prototype reconciler loop aligned to G3 plan:
 * - No side effects on module import
 * - No loop overlap
 * - Start/stop lifecycle
 * - Backoff only on infrastructure/transient errors
 */
export class IntentReconciler {
  private readonly options: Required<IntentReconcilerOptions>;
  private timeout: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> | null = null;
  private running = false;
  private consecutiveInfraErrors = 0;

  constructor(
    private readonly service: ReconcileService,
    private readonly logger: ReconcilerLogger,
    private readonly metrics: ReconcilerMetrics,
    options: IntentReconcilerOptions = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
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
    if (this.inFlight) {
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
    const startedAt = Date.now();
    this.metrics.increment('dvt.intent.reconcile.sweeps_total', 1);
    try {
      const result = await this.service.reconcileOrphanedIntents({
        thresholdMs: this.options.orphanThresholdMs,
        limit: this.options.limit,
      });

      this.consecutiveInfraErrors = 0;
      this.metrics.increment('dvt.intent.reconcile.inspected_total', result.inspected);
      this.metrics.increment('dvt.intent.reconcile.expired_total', result.expired.length);
      this.metrics.increment('dvt.intent.reconcile.cancelled_total', result.cancelled.length);
      this.metrics.timing('dvt.intent.reconcile.duration_ms', Date.now() - startedAt);
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
      this.metrics.timing('dvt.intent.reconcile.duration_ms', Date.now() - startedAt);

      const isInfra = isInfrastructureError(error);
      const backoffMs = isInfra ? this.computeBackoffMs() : this.options.intervalMs;
      this.metrics.gauge('dvt.intent.reconcile.backoff_ms', backoffMs);

      this.logger.error({
        msg: 'Intent reconciliation sweep failed',
        errorClass: isInfra ? 'infrastructure' : 'logic',
        errorCode: extractErrorCode(error),
        errorMessage: error instanceof Error ? error.message : String(error),
        attempt: this.consecutiveInfraErrors,
        backoffMs,
      });
      this.scheduleNext(backoffMs);
    }
  }

  private computeBackoffMs(): number {
    this.consecutiveInfraErrors += 1;
    const exp = Math.min(this.consecutiveInfraErrors - 1, 10);
    const base = this.options.errorBackoffMsBase * 2 ** exp;
    const capped = Math.min(base, this.options.errorBackoffMsMax);
    const jitterSpan = Math.floor(capped * this.options.jitterRatio);
    const jitter = jitterSpan === 0 ? 0 : Math.floor(Math.random() * (jitterSpan + 1));
    return capped + jitter;
  }
}

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
  if (
    code.startsWith('ECONN') ||
    code === '57P01' ||
    code === '53300' ||
    code === '08006' ||
    code === 'ETIMEDOUT'
  ) {
    return true;
  }
  return false;
}
