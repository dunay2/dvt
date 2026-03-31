import { setTimeout as sleep } from 'node:timers/promises';

export interface ProjectorWorkerRuntimeLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  warn?(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
}

export interface ProjectorStateStore {
  claimSnapshotWork?(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string; claimToken: string }>>;
  listStaleSnapshotRuns?(batchSize: number): Promise<Array<{ runId: string; tenantId: string }>>;
  isSnapshotStale?(tenantId: string, runId: string): Promise<boolean>;
  completeSnapshotWork?(tenantId: string, runId: string, claimToken: string): Promise<void>;
  failSnapshotWork?(
    tenantId: string,
    runId: string,
    retryDelayMs: number,
    errorMessage: string,
    claimToken: string
  ): Promise<void>;
  rebuildSnapshot(tenantId: string, runId: string): Promise<unknown>;
}

export interface ProjectorTickResult {
  processed: number;
  lag: number;
}

export interface ProjectorWorkerRuntimeOptions {
  batchSize?: number;
  pollIntervalMs?: number;
  errorBackoffMs?: number;
  fallbackPollEveryTicks?: number;
}

const DEFAULT_OPTIONS = {
  batchSize: 50,
  pollIntervalMs: 5000,
  errorBackoffMs: 10000,
  fallbackPollEveryTicks: 12,
} as const;
const INVALID_BATCH_SIZE = 'INVALID_BATCH_SIZE';
const INVALID_FALLBACK_POLL_EVERY_TICKS = 'INVALID_FALLBACK_POLL_EVERY_TICKS';
const CLAIM_NOT_OWNED_ERROR_CODE = 'SNAPSHOT_WORK_CLAIM_NOT_OWNED';

export class ProjectorWorkerRuntime {
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly errorBackoffMs: number;
  private readonly fallbackPollEveryTicks: number;
  private loopPromise: Promise<void> | null = null;
  private waitController: globalThis.AbortController | null = null;
  private running = false;
  private detachAbortListener: (() => void) | null = null;
  private _lagCount = 0;
  private tickCount = 0;

  constructor(
    private readonly stateStore: ProjectorStateStore,
    private readonly logger: ProjectorWorkerRuntimeLogger,
    options: ProjectorWorkerRuntimeOptions = {}
  ) {
    this.batchSize = normalizeBatchSize(options.batchSize ?? DEFAULT_OPTIONS.batchSize);
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_OPTIONS.pollIntervalMs;
    this.errorBackoffMs = options.errorBackoffMs ?? DEFAULT_OPTIONS.errorBackoffMs;
    this.fallbackPollEveryTicks = normalizeFallbackPollEveryTicks(
      options.fallbackPollEveryTicks ?? DEFAULT_OPTIONS.fallbackPollEveryTicks
    );
  }

  get lagCount(): number {
    return this._lagCount;
  }

  start(signal?: globalThis.AbortSignal): Promise<void> {
    if (this.loopPromise !== null) {
      return this.loopPromise;
    }
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

    this.tickCount = 0;
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
    if (!this.running && loopPromise === null) {
      return;
    }
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

  async runOnce(): Promise<ProjectorTickResult> {
    this.tickCount += 1;
    const workItems = await this.loadSnapshotWorkBatch(this.shouldRunFallbackPoll());
    if (workItems === null) {
      this._lagCount = 0;
      this.logger.info(
        { lag: 0, processed: 0, batchSize: this.batchSize },
        'projector worker tick skipped: state store does not support stale snapshot probing'
      );
      return { processed: 0, lag: 0 };
    }

    let lag = 0;
    let processed = 0;

    for (const { runId, tenantId, claimedFromQueue, claimToken } of workItems) {
      const queueClaimToken = claimedFromQueue ? claimToken : undefined;
      if (claimedFromQueue && !queueClaimToken) {
        this.logger.error(
          {
            runId,
            tenantId,
          },
          'projector worker: queue claim missing claim token'
        );
        continue;
      }

      try {
        if (this.stateStore.isSnapshotStale) {
          const stale = await this.stateStore.isSnapshotStale(tenantId, runId);
          if (!stale) {
            if (claimedFromQueue && this.stateStore.completeSnapshotWork) {
              await this.completeClaimedWork(tenantId, runId, queueClaimToken!);
            }
            continue;
          }
        }
        lag += 1;
        await this.stateStore.rebuildSnapshot(tenantId, runId);
        if (claimedFromQueue && this.stateStore.completeSnapshotWork) {
          await this.completeClaimedWork(tenantId, runId, queueClaimToken!);
        }
        processed++;
      } catch (err) {
        if (isClaimNotOwnedError(err)) {
          this.logClaimOwnershipWarning(
            tenantId,
            runId,
            err,
            'projector worker: claim ownership lost'
          );
          continue;
        }
        if (claimedFromQueue && this.stateStore.failSnapshotWork) {
          try {
            await this.failClaimedWork(tenantId, runId, queueClaimToken!, toErrorLike(err).message);
          } catch (releaseErr) {
            if (isClaimNotOwnedError(releaseErr)) {
              this.logClaimOwnershipWarning(
                tenantId,
                runId,
                releaseErr,
                'projector worker: failSnapshotWork ownership lost'
              );
            } else {
              this.logger.error(
                { err: toErrorLike(releaseErr), runId, tenantId },
                'projector worker: failSnapshotWork failed'
              );
            }
          }
        }
        this.logger.error(
          { err: toErrorLike(err), runId, tenantId },
          'projector worker: rebuildSnapshot failed'
        );
      }
    }

    this._lagCount = lag;
    this.logger.info({ lag, processed, batchSize: this.batchSize }, 'projector worker tick');

    return { processed, lag };
  }

  private async loadSnapshotWorkBatch(allowFallbackPoll: boolean): Promise<Array<{
    runId: string;
    tenantId: string;
    claimedFromQueue: boolean;
    claimToken?: string;
  }> | null> {
    const claimedByKey = new Set<string>();
    const workItems: Array<{
      runId: string;
      tenantId: string;
      claimedFromQueue: boolean;
      claimToken?: string;
    }> = [];

    if (this.stateStore.claimSnapshotWork) {
      const claimed = await this.stateStore.claimSnapshotWork(this.batchSize);
      for (const item of claimed) {
        const key = `${item.tenantId}::${item.runId}`;
        claimedByKey.add(key);
        workItems.push({
          runId: item.runId,
          tenantId: item.tenantId,
          claimedFromQueue: true,
          claimToken: item.claimToken,
        });
      }
    }

    if (
      this.stateStore.listStaleSnapshotRuns &&
      (workItems.length === 0 || workItems.length < this.batchSize) &&
      (!this.stateStore.claimSnapshotWork || allowFallbackPoll)
    ) {
      const pollingBatchSize = this.batchSize - workItems.length;
      if (pollingBatchSize > 0) {
        const staleByPolling = await this.stateStore.listStaleSnapshotRuns(pollingBatchSize);
        for (const item of staleByPolling) {
          const key = `${item.tenantId}::${item.runId}`;
          if (!claimedByKey.has(key)) {
            workItems.push({
              runId: item.runId,
              tenantId: item.tenantId,
              claimedFromQueue: false,
            });
          }
        }
      }
    }

    if (workItems.length > 0) {
      return workItems;
    }
    if (this.stateStore.claimSnapshotWork || this.stateStore.listStaleSnapshotRuns) {
      return [];
    }
    return null;
  }

  private shouldRunFallbackPoll(): boolean {
    if (!this.stateStore.claimSnapshotWork || !this.stateStore.listStaleSnapshotRuns) {
      return true;
    }
    return this.tickCount === 1 || this.tickCount % this.fallbackPollEveryTicks === 0;
  }

  private async runLoop(): Promise<void> {
    this.logger.info(
      {
        batchSize: this.batchSize,
        pollIntervalMs: this.pollIntervalMs,
        errorBackoffMs: this.errorBackoffMs,
      },
      'projector worker runtime started'
    );

    try {
      while (this.running) {
        const shouldContinue = await this.runLoopIteration();
        if (!shouldContinue) {
          break;
        }
      }
    } finally {
      this.logger.info({}, 'projector worker runtime stopped');
    }
  }

  private async runLoopIteration(): Promise<boolean> {
    try {
      await this.runOnce();
    } catch (err) {
      if (!this.running) {
        return false;
      }
      this.logger.error(
        { err: toErrorLike(err), backoffMs: this.errorBackoffMs },
        'projector worker tick failed'
      );
      await this.wait(this.errorBackoffMs);
      return this.running;
    }

    if (!this.running) {
      return false;
    }
    await this.wait(this.pollIntervalMs);
    return this.running;
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

  private async completeClaimedWork(
    tenantId: string,
    runId: string,
    claimToken: string
  ): Promise<void> {
    if (!this.stateStore.completeSnapshotWork) {
      return;
    }
    try {
      await this.stateStore.completeSnapshotWork(tenantId, runId, claimToken);
    } catch (err) {
      if (isClaimNotOwnedError(err)) {
        this.logClaimOwnershipWarning(
          tenantId,
          runId,
          err,
          'projector worker: completeSnapshotWork ownership lost'
        );
        return;
      }
      throw err;
    }
  }

  private async failClaimedWork(
    tenantId: string,
    runId: string,
    claimToken: string,
    errorMessage: string
  ): Promise<void> {
    if (!this.stateStore.failSnapshotWork) {
      return;
    }
    await this.stateStore.failSnapshotWork(
      tenantId,
      runId,
      this.errorBackoffMs,
      errorMessage,
      claimToken
    );
  }

  private logClaimOwnershipWarning(
    tenantId: string,
    runId: string,
    err: unknown,
    message: string
  ): void {
    const payload = { err: toErrorLike(err), runId, tenantId };
    if (this.logger.warn) {
      this.logger.warn(payload, message);
      return;
    }
    this.logger.info(payload, message);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function toErrorLike(error: unknown): { message: string; name: string } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }
  return { message: String(error), name: 'UnknownError' };
}

function normalizeFallbackPollEveryTicks(value: number): number {
  if (!Number.isInteger(value) || !Number.isFinite(value) || value < 1) {
    throw new Error(`${INVALID_FALLBACK_POLL_EVERY_TICKS}: ${value}`);
  }
  return value;
}

function normalizeBatchSize(value: number): number {
  if (!Number.isInteger(value) || !Number.isFinite(value) || value < 1) {
    throw new Error(`${INVALID_BATCH_SIZE}: ${value}`);
  }
  return value;
}

function isClaimNotOwnedError(error: unknown): boolean {
  return toErrorLike(error).message.includes(CLAIM_NOT_OWNED_ERROR_CODE);
}
