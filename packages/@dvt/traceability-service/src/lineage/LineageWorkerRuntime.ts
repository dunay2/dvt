import { setTimeout as sleep } from 'node:timers/promises';

import type { ILineageOutboxStore, ILineageSink, ILineageStepEventMapper } from './contracts.js';
import { isLineageAbortError, toLineageErrorLike } from './errorSupport.js';
import {
  collectLineageDeadLetterCount,
  maybeAlertLineageDeadLetterBacklog,
  runLineageDeadLetterAutoReplay,
} from './runtime/lineageWorkerDeadLetterSupport.js';
import { processLineageOutboxRecord } from './runtime/lineageWorkerRecordProcessor.js';
import { resolveLineageWorkerRuntimeOptions } from './runtime/lineageWorkerRuntimeConfig.js';

export interface LineageWorkerRuntimeLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  warn?(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
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
    private readonly mapper: ILineageStepEventMapper,
    private readonly logger: LineageWorkerRuntimeLogger,
    options: LineageWorkerRuntimeOptions = {}
  ) {
    const resolvedOptions = resolveLineageWorkerRuntimeOptions(this.store, options);

    this.batchSize = resolvedOptions.batchSize;
    this.pollIntervalMs = resolvedOptions.pollIntervalMs;
    this.errorBackoffMs = resolvedOptions.errorBackoffMs;
    this.deadLetterTenantId = resolvedOptions.deadLetterTenantId;
    this.deadLetterAlertThreshold = resolvedOptions.deadLetterAlertThreshold;
    this.autoReplayEnabled = resolvedOptions.autoReplayEnabled;
    this.autoReplayBatchSize = resolvedOptions.autoReplayBatchSize;
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
      const result = await processLineageOutboxRecord({
        record,
        store: this.store,
        sink: this.sink,
        mapper: this.mapper,
        logger: this.logger,
      });
      if (result === 'delivered') processed++;
      if (result === 'dead_lettered') deadLettered++;
    }

    const deadLetterCount = await collectLineageDeadLetterCount({
      deadLetterTenantId: this.deadLetterTenantId,
      logger: this.logger,
      store: this.store,
    });
    this._deadLetterCount = deadLetterCount;
    await runLineageDeadLetterAutoReplay({
      autoReplayBatchSize: this.autoReplayBatchSize,
      autoReplayEnabled: this.autoReplayEnabled,
      deadLetterCount,
      deadLetterTenantId: this.deadLetterTenantId,
      logger: this.logger,
      store: this.store,
    });
    maybeAlertLineageDeadLetterBacklog({
      deadLetterAlertThreshold: this.deadLetterAlertThreshold,
      deadLetterCount,
      deadLetterTenantId: this.deadLetterTenantId,
      logger: this.logger,
    });

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
        { err: toLineageErrorLike(err), backoffMs: this.errorBackoffMs },
        'lineage worker tick failed'
      );
      await this.wait(this.errorBackoffMs);
      return this.running;
    }

    if (!this.running) return false;
    await this.wait(this.pollIntervalMs);
    return this.running;
  }

  private async wait(delayMs: number): Promise<void> {
    const controller = new globalThis.AbortController();
    this.waitController = controller;
    try {
      await sleep(delayMs, undefined, { signal: controller.signal });
    } catch (err) {
      if (!isLineageAbortError(err)) {
        throw err;
      }
    } finally {
      if (this.waitController === controller) {
        this.waitController = null;
      }
    }
  }
}
