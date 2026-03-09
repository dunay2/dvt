import { setTimeout as sleep } from 'node:timers/promises';

import {
  OutboxWorker,
  type IEventBus,
  type IOutboxStorage,
  type OutboxTickResult,
  type OutboxWorkerObserver,
} from '@dvt/engine';

export interface OutboxWorkerRuntimeLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  warn?(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
}

export interface OutboxWorkerRuntimeOptions {
  batchSize?: number;
  stopOnError?: boolean;
  pollIntervalMs?: number;
  errorBackoffMs?: number;
  nowMs?: () => number;
  observer?: OutboxWorkerObserver;
  hooks?: OutboxWorkerRuntimeHooks;
}

export interface OutboxWorkerRuntimeHooks {
  onStarted?(): void;
  onTick?(result: OutboxTickResult): void;
  onError?(error: unknown): void;
  onStopped?(): void;
}

type RuntimeTimingOptions = Required<
  Pick<
    OutboxWorkerRuntimeOptions,
    'batchSize' | 'stopOnError' | 'pollIntervalMs' | 'errorBackoffMs'
  >
>;

const DEFAULT_OPTIONS: RuntimeTimingOptions = {
  batchSize: 100,
  stopOnError: false,
  pollIntervalMs: 1000,
  errorBackoffMs: 5000,
};

export class OutboxWorkerRuntime {
  private readonly options: RuntimeTimingOptions;
  private readonly worker: OutboxWorker;
  private readonly hooks: OutboxWorkerRuntimeHooks | undefined;
  private loopPromise: Promise<void> | null = null;
  private waitController: globalThis.AbortController | null = null;
  private running = false;
  private detachAbortListener: (() => void) | null = null;

  constructor(
    storage: IOutboxStorage,
    bus: IEventBus,
    private readonly logger: OutboxWorkerRuntimeLogger,
    options: OutboxWorkerRuntimeOptions = {}
  ) {
    this.options = {
      batchSize: options.batchSize ?? DEFAULT_OPTIONS.batchSize,
      stopOnError: options.stopOnError ?? DEFAULT_OPTIONS.stopOnError,
      pollIntervalMs: options.pollIntervalMs ?? DEFAULT_OPTIONS.pollIntervalMs,
      errorBackoffMs: options.errorBackoffMs ?? DEFAULT_OPTIONS.errorBackoffMs,
    };
    this.hooks = options.hooks;
    this.worker = new OutboxWorker(storage, bus, {
      batchSize: this.options.batchSize,
      stopOnError: this.options.stopOnError,
      nowMs: options.nowMs ?? (() => Date.now()),
      ...(options.observer ? { observer: options.observer } : {}),
    });
  }

  start(signal?: globalThis.AbortSignal): Promise<void> {
    if (this.loopPromise) return this.loopPromise;
    this.running = true;

    if (signal) {
      if (signal.aborted) {
        this.running = false;
        return Promise.resolve();
      }
      const onAbort = (): void => {
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
      try {
        await loopPromise;
      } catch {
        // start() is responsible for surfacing loop failures; stop() is cleanup only.
      }
    }
  }

  private async runLoop(): Promise<void> {
    this.runHook('onStarted');
    this.logger.info(
      {
        batchSize: this.options.batchSize,
        pollIntervalMs: this.options.pollIntervalMs,
        errorBackoffMs: this.options.errorBackoffMs,
        stopOnError: this.options.stopOnError,
      },
      'outbox worker runtime started'
    );

    try {
      while (this.running) {
        try {
          const result = await this.worker.tick();
          this.runHook('onTick', result);
        } catch (err) {
          const tickResult = extractTickResult(err);
          const runtimeError = unwrapTickError(err);
          if (tickResult) {
            this.runHook('onTick', tickResult);
          }
          this.runHook('onError', runtimeError);
          this.logger.error(
            { err: toErrorLike(runtimeError), backoffMs: this.options.errorBackoffMs },
            'outbox worker tick failed'
          );
          if (this.options.stopOnError) {
            this.running = false;
            throw runtimeError;
          }
          if (!this.running) break;
          await this.wait(this.options.errorBackoffMs);
          continue;
        }

        if (!this.running) break;
        await this.wait(this.options.pollIntervalMs);
      }
    } finally {
      this.runHook('onStopped');
      this.logger.info({}, 'outbox worker runtime stopped');
    }
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

  private runHook(name: keyof OutboxWorkerRuntimeHooks, value?: OutboxTickResult | unknown): void {
    const hooks = this.hooks;
    if (!hooks) return;
    const hook = hooks[name];
    if (!hook) return;
    try {
      if (name === 'onTick') {
        (hook as (this: OutboxWorkerRuntimeHooks, result: OutboxTickResult) => void).call(
          hooks,
          value as OutboxTickResult
        );
        return;
      }
      if (name === 'onError') {
        (hook as (this: OutboxWorkerRuntimeHooks, error: unknown) => void).call(hooks, value);
        return;
      }
      (hook as (this: OutboxWorkerRuntimeHooks) => void).call(hooks);
    } catch (err) {
      this.logger.warn?.({ err: toErrorLike(err), hook: name }, 'outbox runtime hook failed');
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

function extractTickResult(error: unknown): OutboxTickResult | null {
  if (!isTickErrorWithResult(error)) {
    return null;
  }
  return error.tickResult;
}

function unwrapTickError(error: unknown): unknown {
  if (!isTickErrorWithResult(error)) {
    return error;
  }
  return error.cause;
}

function isTickErrorWithResult(
  error: unknown
): error is Error & { cause: unknown; tickResult: OutboxTickResult } {
  if (!(error instanceof Error) || !('tickResult' in error)) {
    return false;
  }
  return isOutboxTickResult((error as { tickResult?: unknown }).tickResult);
}

function isOutboxTickResult(value: unknown): value is OutboxTickResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<OutboxTickResult>;
  return (
    typeof candidate.claimedCount === 'number' &&
    typeof candidate.deliveredCount === 'number' &&
    typeof candidate.retriedCount === 'number' &&
    typeof candidate.deadLetteredCount === 'number' &&
    (candidate.oldestClaimedAgeMs === null || typeof candidate.oldestClaimedAgeMs === 'number') &&
    typeof candidate.retryBacklogActive === 'boolean'
  );
}
