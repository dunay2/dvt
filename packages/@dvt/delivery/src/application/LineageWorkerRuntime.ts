import { setTimeout as sleep } from 'node:timers/promises';

import type { ILineageOutboxStore, ILineageSink, LineageOutboxRecord } from '@dvt/contracts';

export interface LineageWorkerRuntimeLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  warn?(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
}

export interface LineageStepEventMapper {
  supports(payload: { eventType: string }): boolean;
  map(
    payload: unknown
  ): Promise<{ jobFacets: unknown; warnings: Array<{ code: string; message: string }> }>;
}

export interface LineageWorkerRuntimeOptions {
  batchSize?: number;
  pollIntervalMs?: number;
  errorBackoffMs?: number;
  deadLetterTenantId?: string;
  deadLetterAlertThreshold?: number;
  autoReplayEnabled?: boolean;
  autoReplayBatchSize?: number;
}

const DEFAULT_OPTIONS = {
  batchSize: 50,
  pollIntervalMs: 5000,
  errorBackoffMs: 10000,
  deadLetterAlertThreshold: 0,
  autoReplayEnabled: false,
  autoReplayBatchSize: 25,
} as const;

export interface LineageTickResult {
  processed: number;
  deadLettered: number;
  lag: number;
}

export class LineageWorkerRuntime {
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly errorBackoffMs: number;
  private readonly deadLetterTenantId: string | null;
  private readonly deadLetterAlertThreshold: number;
  private readonly autoReplayEnabled: boolean;
  private readonly autoReplayBatchSize: number;
  private loopPromise: Promise<void> | null = null;
  private waitController: globalThis.AbortController | null = null;
  private running = false;
  private detachAbortListener: (() => void) | null = null;
  private _lagCount = 0;
  private _deadLetterCount: number | null = null;

  constructor(
    private readonly store: ILineageOutboxStore,
    private readonly sink: ILineageSink,
    private readonly mapper: LineageStepEventMapper,
    private readonly logger: LineageWorkerRuntimeLogger,
    options: LineageWorkerRuntimeOptions = {}
  ) {
    this.batchSize = options.batchSize ?? DEFAULT_OPTIONS.batchSize;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_OPTIONS.pollIntervalMs;
    this.errorBackoffMs = options.errorBackoffMs ?? DEFAULT_OPTIONS.errorBackoffMs;
    this.deadLetterTenantId = normalizeOptionalScopeValue(options.deadLetterTenantId);
    this.deadLetterAlertThreshold = normalizeNonNegativeInteger(
      options.deadLetterAlertThreshold ?? DEFAULT_OPTIONS.deadLetterAlertThreshold,
      'deadLetterAlertThreshold'
    );
    this.autoReplayEnabled = options.autoReplayEnabled ?? DEFAULT_OPTIONS.autoReplayEnabled;
    this.autoReplayBatchSize = normalizePositiveInteger(
      options.autoReplayBatchSize ?? DEFAULT_OPTIONS.autoReplayBatchSize,
      'autoReplayBatchSize'
    );

    if (this.autoReplayEnabled && this.deadLetterTenantId === null) {
      throw new Error('INVALID_LINEAGE_RUNTIME_CONFIG: deadLetterTenantId is required');
    }
    if (this.deadLetterAlertThreshold > 0 && this.deadLetterTenantId === null) {
      throw new Error(
        'INVALID_LINEAGE_RUNTIME_CONFIG: deadLetterTenantId is required for dead-letter alerts'
      );
    }
    if (this.deadLetterTenantId !== null && this.store.countDeadLetter === undefined) {
      throw new Error(
        'INVALID_LINEAGE_RUNTIME_CONFIG: store.countDeadLetter is required for dead-letter scope'
      );
    }
    if (this.autoReplayEnabled && this.store.replayDeadLetters === undefined) {
      throw new Error(
        'INVALID_LINEAGE_RUNTIME_CONFIG: store.replayDeadLetters is required for auto replay'
      );
    }
  }

  get lagCount(): number {
    return this._lagCount;
  }

  get deadLetterCount(): number | null {
    return this._deadLetterCount;
  }

  start(signal?: globalThis.AbortSignal): Promise<void> {
    if (this.loopPromise !== null) return this.loopPromise;
    this.running = true;

    if (signal) {
      const onAbort = (): void => {
        void this.stop();
      };
      signal.addEventListener('abort', onAbort, { once: true });
      this.detachAbortListener = () => signal.removeEventListener('abort', onAbort);

      if (signal.aborted) {
        this.running = false;
        this.detachAbortListener();
        this.detachAbortListener = null;
        return Promise.resolve();
      }
    }

    if (!this.running) {
      this.detachAbortListener?.();
      this.detachAbortListener = null;
      return Promise.resolve();
    }

    this.loopPromise = this.runLoop().finally(() => {
      this.running = false;
      this.waitController = null;
      this.detachAbortListener?.();
      this.detachAbortListener = null;
      this.loopPromise = null;
    });

    return this.loopPromise;
  }

  async stop(): Promise<void> {
    const loopPromise = this.loopPromise;
    if (!this.running && loopPromise === null) return;
    this.running = false;
    this.waitController?.abort();
    if (loopPromise !== null) {
      try {
        await loopPromise;
      } catch {
        // start() surfaces loop failures; stop() is cleanup only.
      }
    }
  }

  async runOnce(): Promise<LineageTickResult> {
    const pending = await this.store.listPending(this.batchSize);
    const pendingCount =
      this.store.countPending === undefined ? pending.length : await this.store.countPending();
    this._lagCount = pendingCount;
    let processed = 0;
    let deadLettered = 0;

    for (const record of pending) {
      const result = await this.processRecord(record);
      if (result === 'delivered') processed++;
      if (result === 'dead_lettered') deadLettered++;
    }

    const deadLetterCount = await this.collectDeadLetterCount();
    this._deadLetterCount = deadLetterCount;
    await this.runDeadLetterAutoReplay(deadLetterCount);
    this.maybeAlertDeadLetterBacklog(deadLetterCount);

    this.logger.info(
      {
        lag: this._lagCount,
        deadLetterLag: this._deadLetterCount,
        deadLetterLagKnown: this._deadLetterCount !== null,
        processed,
        deadLettered,
        batchSize: this.batchSize,
      },
      'lineage worker tick'
    );

    return { processed, deadLettered, lag: this._lagCount };
  }

  private async processRecord(
    record: LineageOutboxRecord
  ): Promise<'delivered' | 'failed' | 'dead_lettered' | 'skipped'> {
    if (!this.mapper.supports(record.payload)) {
      await this.store.markDelivered([record.id]).catch(() => undefined);
      return 'skipped';
    }

    try {
      const { jobFacets, warnings } = await this.mapper.map(record.payload);
      await this.sink.publish({
        runId: record.runId,
        eventType: record.eventType,
        jobFacets,
        warnings,
      });
      await this.store.markDelivered([record.id]);
      return 'delivered';
    } catch (err) {
      const error = sanitizeErrorForPersistence(err);
      const disposition = await this.store
        .markFailed(record.id, error)
        .catch((markErr: unknown) => {
          this.logger.error(
            { err: toErrorLike(markErr), runId: record.runId, id: record.id },
            'lineage worker: markFailed write failed'
          );
          return 'not_found' as const;
        });

      if (disposition === 'dead_lettered') {
        this.logger.warn?.(
          {
            err: toErrorLike(err),
            runId: record.runId,
            id: record.id,
            attempts: record.attempts + 1,
          },
          'lineage worker: max attempts reached, moved to dead letter'
        );
        return 'dead_lettered';
      }

      if (disposition === 'retry_scheduled') {
        this.logger.warn?.(
          {
            err: toErrorLike(err),
            runId: record.runId,
            id: record.id,
            attempts: record.attempts + 1,
          },
          'lineage worker: publish failed, will retry'
        );
      } else {
        this.logger.warn?.(
          { err: toErrorLike(err), runId: record.runId, id: record.id },
          'lineage worker: publish failed but record was not found during retry mark'
        );
      }

      return 'failed';
    }
  }

  private async runLoop(): Promise<void> {
    this.logger.info(
      {
        batchSize: this.batchSize,
        pollIntervalMs: this.pollIntervalMs,
        errorBackoffMs: this.errorBackoffMs,
      },
      'lineage worker runtime started'
    );

    try {
      while (this.running) {
        const shouldContinue = await this.runLoopIteration();
        if (!shouldContinue) break;
      }
    } finally {
      this.logger.info({}, 'lineage worker runtime stopped');
    }
  }

  private async runLoopIteration(): Promise<boolean> {
    try {
      await this.runOnce();
    } catch (err) {
      if (!this.running) return false;
      this.logger.error(
        { err: toErrorLike(err), backoffMs: this.errorBackoffMs },
        'lineage worker tick failed'
      );
      await this.wait(this.errorBackoffMs);
      return this.running;
    }

    if (!this.running) return false;
    await this.wait(this.pollIntervalMs);
    return this.running;
  }

  private async collectDeadLetterCount(): Promise<number | null> {
    if (this.deadLetterTenantId === null || this.store.countDeadLetter === undefined) {
      return null;
    }

    try {
      return await this.store.countDeadLetter(this.deadLetterTenantId);
    } catch (err) {
      this.logger.error(
        { err: toErrorLike(err), tenantId: this.deadLetterTenantId },
        'lineage worker: dead-letter count failed'
      );
      return null;
    }
  }

  private async runDeadLetterAutoReplay(deadLetterCount: number | null): Promise<void> {
    if (
      deadLetterCount === null ||
      deadLetterCount === 0 ||
      !this.autoReplayEnabled ||
      this.deadLetterTenantId === null ||
      this.store.replayDeadLetters === undefined
    ) {
      return;
    }

    try {
      const moved = await this.store.replayDeadLetters({
        tenantId: this.deadLetterTenantId,
        limit: this.autoReplayBatchSize,
      });
      if (moved > 0) {
        this.logger.warn?.(
          {
            moved,
            tenantId: this.deadLetterTenantId,
            replayBatchSize: this.autoReplayBatchSize,
            deadLetterLagBeforeReplay: deadLetterCount,
          },
          'lineage worker: automatic dead-letter replay moved records back to pending'
        );
      }
    } catch (err) {
      this.logger.error(
        {
          err: toErrorLike(err),
          tenantId: this.deadLetterTenantId,
          replayBatchSize: this.autoReplayBatchSize,
        },
        'lineage worker: automatic dead-letter replay failed'
      );
    }
  }

  private maybeAlertDeadLetterBacklog(deadLetterCount: number | null): void {
    if (
      deadLetterCount === null ||
      this.deadLetterTenantId === null ||
      this.deadLetterAlertThreshold === 0 ||
      deadLetterCount < this.deadLetterAlertThreshold
    ) {
      return;
    }

    this.logger.warn?.(
      {
        tenantId: this.deadLetterTenantId,
        deadLetterLag: deadLetterCount,
        deadLetterAlertThreshold: this.deadLetterAlertThreshold,
      },
      'lineage worker: dead-letter backlog threshold reached'
    );
  }

  private async wait(delayMs: number): Promise<void> {
    const controller = new globalThis.AbortController();
    this.waitController = controller;
    try {
      await sleep(delayMs, undefined, { signal: controller.signal });
    } catch (err) {
      if (!isAbortError(err)) {
        throw err;
      }
    } finally {
      if (this.waitController === controller) {
        this.waitController = null;
      }
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function toErrorLike(error: unknown): { message: string; name: string } {
  if (error instanceof Error) {
    return { message: sanitizeErrorForPersistence(error.message), name: error.name };
  }
  if (typeof error === 'object' && error !== null) {
    try {
      return { message: sanitizeErrorForPersistence(JSON.stringify(error)), name: 'UnknownError' };
    } catch {
      return { message: '[object with circular reference]', name: 'UnknownError' };
    }
  }
  return { message: sanitizeErrorForPersistence(String(error)), name: 'UnknownError' };
}

function sanitizeErrorForPersistence(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const singleLine = raw.replace(/\s+/g, ' ').trim();
  const redacted = singleLine
    .replace(
      /("(?:password|passwd|pwd|secret|token|apikey|api_key)"\s*:\s*)"[^"]*"/gi,
      '$1"[REDACTED]"'
    )
    .replace(
      /(password|passwd|pwd|secret|token|apikey|api_key)\s*[=:]\s*[^,\s;]+/gi,
      '$1=[REDACTED]'
    )
    .replace(/bearer\s+\S+/gi, 'bearer [REDACTED]');
  if (redacted.length <= 512) {
    return redacted;
  }
  return `${redacted.slice(0, 509)}...`;
}

function normalizeOptionalScopeValue(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizePositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`INVALID_LINEAGE_RUNTIME_CONFIG: ${fieldName}`);
  }
  return value;
}

function normalizeNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`INVALID_LINEAGE_RUNTIME_CONFIG: ${fieldName}`);
  }
  return value;
}
