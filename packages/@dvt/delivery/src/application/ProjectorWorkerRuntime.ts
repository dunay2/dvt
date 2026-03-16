import { setTimeout as sleep } from 'node:timers/promises';

export interface ProjectorWorkerRuntimeLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  warn?(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
}

export interface ProjectorStateStore {
  listStaleSnapshotRuns?(batchSize: number): Promise<Array<{ runId: string; tenantId: string }>>;
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
    if (!this.stateStore.listStaleSnapshotRuns) {
      this._lagCount = 0;
      this.logger.info(
        { lag: 0, processed: 0, batchSize: this.batchSize },
        'projector worker tick skipped: state store does not support stale snapshot probing'
      );
      return { processed: 0, lag: 0 };
    }

    const staleRuns = await this.stateStore.listStaleSnapshotRuns(this.batchSize);
    this._lagCount = staleRuns.length;
    let processed = 0;

    for (const { runId, tenantId } of staleRuns) {
      try {
        await this.stateStore.rebuildSnapshot(tenantId, runId);
        processed++;
      } catch (err) {
        this.logger.error(
          { err: toErrorLike(err), runId, tenantId },
          'projector worker: rebuildSnapshot failed'
        );
      }
    }

    this.logger.info(
      { lag: this._lagCount, processed, batchSize: this.batchSize },
      'projector worker tick'
    );

    return { processed, lag: this._lagCount };
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
