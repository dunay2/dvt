import { setTimeout as sleep } from 'node:timers/promises';

export interface ProjectorWorkerRuntimeLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  warn?(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
}

export interface ProjectorStateStore {
  claimSnapshotWork?(batchSize: number): Promise<Array<{ runId: string; tenantId: string }>>;
  listStaleSnapshotRuns?(batchSize: number): Promise<Array<{ runId: string; tenantId: string }>>;
  isSnapshotStale?(tenantId: string, runId: string): Promise<boolean>;
  completeSnapshotWork?(tenantId: string, runId: string): Promise<void>;
  failSnapshotWork?(tenantId: string, runId: string, retryDelayMs: number): Promise<void>;
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
}

const DEFAULT_OPTIONS = {
  batchSize: 50,
  pollIntervalMs: 5000,
  errorBackoffMs: 10000,
} as const;

export class ProjectorWorkerRuntime {
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly errorBackoffMs: number;
  private loopPromise: Promise<void> | null = null;
  private waitController: globalThis.AbortController | null = null;
  private running = false;
  private detachAbortListener: (() => void) | null = null;
  private _lagCount = 0;

  constructor(
    private readonly stateStore: ProjectorStateStore,
    private readonly logger: ProjectorWorkerRuntimeLogger,
    options: ProjectorWorkerRuntimeOptions = {}
  ) {
    this.batchSize = options.batchSize ?? DEFAULT_OPTIONS.batchSize;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_OPTIONS.pollIntervalMs;
    this.errorBackoffMs = options.errorBackoffMs ?? DEFAULT_OPTIONS.errorBackoffMs;
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
    const workItems = await this.loadSnapshotWorkBatch();
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

    for (const { runId, tenantId, claimedFromQueue } of workItems) {
      try {
        if (this.stateStore.isSnapshotStale) {
          const stale = await this.stateStore.isSnapshotStale(tenantId, runId);
          if (!stale) {
            if (claimedFromQueue && this.stateStore.completeSnapshotWork) {
              await this.stateStore.completeSnapshotWork(tenantId, runId);
            }
            continue;
          }
        }
        lag += 1;
        await this.stateStore.rebuildSnapshot(tenantId, runId);
        if (claimedFromQueue && this.stateStore.completeSnapshotWork) {
          await this.stateStore.completeSnapshotWork(tenantId, runId);
        }
        processed++;
      } catch (err) {
        if (claimedFromQueue && this.stateStore.failSnapshotWork) {
          try {
            await this.stateStore.failSnapshotWork(tenantId, runId, this.errorBackoffMs);
          } catch (releaseErr) {
            this.logger.error(
              { err: toErrorLike(releaseErr), runId, tenantId },
              'projector worker: failSnapshotWork failed'
            );
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

  private async loadSnapshotWorkBatch(): Promise<Array<{
    runId: string;
    tenantId: string;
    claimedFromQueue: boolean;
  }> | null> {
    const claimedByKey = new Set<string>();
    const workItems: Array<{ runId: string; tenantId: string; claimedFromQueue: boolean }> = [];

    if (this.stateStore.claimSnapshotWork) {
      const claimed = await this.stateStore.claimSnapshotWork(this.batchSize);
      for (const item of claimed) {
        const key = `${item.tenantId}::${item.runId}`;
        claimedByKey.add(key);
        workItems.push({ ...item, claimedFromQueue: true });
      }
    }

    if (
      this.stateStore.listStaleSnapshotRuns &&
      (workItems.length === 0 || workItems.length < this.batchSize)
    ) {
      const pollingBatchSize = this.batchSize - workItems.length;
      if (pollingBatchSize > 0) {
        const staleByPolling = await this.stateStore.listStaleSnapshotRuns(pollingBatchSize);
        for (const item of staleByPolling) {
          const key = `${item.tenantId}::${item.runId}`;
          if (!claimedByKey.has(key)) {
            workItems.push({ ...item, claimedFromQueue: false });
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
