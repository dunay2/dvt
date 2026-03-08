import { setTimeout as sleep } from 'node:timers/promises';

import { OutboxWorker, type IEventBus, type IOutboxStorage } from '@dvt/engine';

export interface OutboxWorkerRuntimeLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
}

export interface OutboxWorkerRuntimeOptions {
  batchSize?: number;
  stopOnError?: boolean;
  pollIntervalMs?: number;
  errorBackoffMs?: number;
}

const DEFAULT_OPTIONS: Required<OutboxWorkerRuntimeOptions> = {
  batchSize: 100,
  stopOnError: false,
  pollIntervalMs: 1000,
  errorBackoffMs: 5000,
};

export class OutboxWorkerRuntime {
  private readonly options: Required<OutboxWorkerRuntimeOptions>;
  private readonly worker: OutboxWorker;
  private loopPromise: Promise<void> | null = null;
  private waitController: AbortController | null = null;
  private running = false;
  private detachAbortListener: (() => void) | null = null;

  constructor(
    storage: IOutboxStorage,
    bus: IEventBus,
    private readonly logger: OutboxWorkerRuntimeLogger,
    options: OutboxWorkerRuntimeOptions = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.worker = new OutboxWorker(storage, bus, {
      batchSize: this.options.batchSize,
      stopOnError: this.options.stopOnError,
    });
  }

  start(signal?: AbortSignal): Promise<void> {
    if (this.loopPromise) return this.loopPromise;
    this.running = true;

    if (signal) {
      if (signal.aborted) {
        this.running = false;
        return Promise.resolve();
      }
      const onAbort = () => {
        void this.stop();
      };
      signal.addEventListener('abort', onAbort, { once: true });
      this.detachAbortListener = () => signal.removeEventListener('abort', onAbort);
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
    if (loopPromise) {
      await loopPromise;
    }
  }

  private async runLoop(): Promise<void> {
    this.logger.info(
      {
        batchSize: this.options.batchSize,
        pollIntervalMs: this.options.pollIntervalMs,
        errorBackoffMs: this.options.errorBackoffMs,
        stopOnError: this.options.stopOnError,
      },
      'outbox worker runtime started'
    );

    while (this.running) {
      try {
        await this.worker.tick();
      } catch (err) {
        this.logger.error(
          { err: toErrorLike(err), backoffMs: this.options.errorBackoffMs },
          'outbox worker tick failed'
        );
        if (!this.running) break;
        await this.wait(this.options.errorBackoffMs);
        continue;
      }

      if (!this.running) break;
      await this.wait(this.options.pollIntervalMs);
    }

    this.logger.info({}, 'outbox worker runtime stopped');
  }

  private async wait(delayMs: number): Promise<void> {
    const controller = new AbortController();
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
