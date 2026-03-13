import { setTimeout as sleep } from 'node:timers/promises';

import type {
  IEventBus,
  IOutboxStorage,
  OutboxClaimSelection,
  OutboxTickResult,
  OutboxWorkerObserver,
} from '@dvt/contracts';
import { OutboxWorker } from '@dvt/engine';

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
  claimSelection?: OutboxClaimSelection | (() => OutboxClaimSelection | undefined);
  hooks?: OutboxWorkerRuntimeHooks;
  interruptPendingTick?: () => void | Promise<void>;
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
  private readonly interruptPendingTick: (() => void | Promise<void>) | undefined;
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
    this.interruptPendingTick = options.interruptPendingTick;
    const claimSelection = options.claimSelection;
    this.worker = new OutboxWorker(storage, bus, {
      batchSize: this.options.batchSize,
      stopOnError: this.options.stopOnError,
      nowMs: options.nowMs ?? (() => Date.now()),
      ...(claimSelection === undefined ? {} : { claimSelection }),
      ...(options.observer ? { observer: options.observer } : {}),
    });
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
    await this.interruptTick();
    if (loopPromise !== null) {
      try {
        await loopPromise;
      } catch {
        // start() is responsible for surfacing loop failures; stop() is cleanup only.
      }
    }
  }

  private async runLoop(): Promise<void> {
    this.runStartedHook();
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
        const shouldContinue = await this.runLoopIteration();
        if (!shouldContinue) break;
      }
    } finally {
      this.runStoppedHook();
      this.logger.info({}, 'outbox worker runtime stopped');
    }
  }

  private async runLoopIteration(): Promise<boolean> {
    try {
      const result = await this.worker.tick();
      this.runTickHook(result);
    } catch (error) {
      return this.handleTickFailure(error);
    }

    if (!this.running) {
      return false;
    }

    await this.wait(this.options.pollIntervalMs);
    return this.running;
  }

  private async handleTickFailure(error: unknown): Promise<boolean> {
    if (!this.running) {
      return false;
    }

    const tickResult = extractTickResult(error);
    const runtimeError = unwrapTickError(error);

    if (tickResult) {
      this.runTickHook(tickResult);
    }
    this.runErrorHook(runtimeError);
    this.logger.error(
      { err: toErrorLike(runtimeError), backoffMs: this.options.errorBackoffMs },
      'outbox worker tick failed'
    );

    if (this.options.stopOnError) {
      this.running = false;
      throw runtimeError;
    }

    if (!this.running) {
      return false;
    }

    await this.wait(this.options.errorBackoffMs);
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

  private runStartedHook(): void {
    this.runLifecycleHook('onStarted');
  }

  private runTickHook(result: OutboxTickResult): void {
    this.runValueHook('onTick', result);
  }

  private runErrorHook(error: unknown): void {
    this.runValueHook('onError', error);
  }

  private runStoppedHook(): void {
    this.runLifecycleHook('onStopped');
  }

  private runLifecycleHook(name: 'onStarted' | 'onStopped'): void {
    const hooks = this.hooks;
    if (!hooks) return;
    const hook = hooks[name];
    if (!hook) return;
    try {
      (hook as (this: OutboxWorkerRuntimeHooks) => void).call(hooks);
    } catch (err) {
      this.logger.warn?.({ err: toErrorLike(err), hook: name }, 'outbox runtime hook failed');
    }
  }

  private runValueHook(name: 'onTick', value: OutboxTickResult): void;
  private runValueHook(name: 'onError', value: unknown): void;
  private runValueHook(name: 'onTick' | 'onError', value: unknown): void {
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
      (hook as (this: OutboxWorkerRuntimeHooks, error: unknown) => void).call(hooks, value);
    } catch (err) {
      this.logger.warn?.({ err: toErrorLike(err), hook: name }, 'outbox runtime hook failed');
    }
  }

  private async interruptTick(): Promise<void> {
    if (!this.interruptPendingTick) return;
    try {
      await this.interruptPendingTick();
    } catch (err) {
      this.logger.warn?.(
        { err: toErrorLike(err) },
        'outbox runtime failed to interrupt an in-flight tick'
      );
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
  return { message: stringifyUnknownError(error), name: 'UnknownError' };
}

function stringifyUnknownError(error: unknown): string {
  switch (typeof error) {
    case 'string':
      return error;
    case 'number':
    case 'boolean':
    case 'bigint':
    case 'undefined':
      return String(error);
    case 'symbol':
      return error.description ?? error.toString();
    case 'function':
      return error.name ? `[function ${error.name}]` : '[function anonymous]';
    case 'object':
      return error === null ? 'null' : serializeErrorObject(error);
    default:
      return 'UnknownErrorValue';
  }
}

function serializeErrorObject(error: object): string {
  try {
    return JSON.stringify(error);
  } catch {
    return Object.prototype.toString.call(error);
  }
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
    hasNumericTickCounters(candidate) &&
    isOptionalNumber(candidate.oldestClaimedAgeMs) &&
    typeof candidate.retryBacklogActive === 'boolean'
  );
}

function hasNumericTickCounters(candidate: Partial<OutboxTickResult>): boolean {
  return (
    typeof candidate.claimedCount === 'number' &&
    typeof candidate.deliveredCount === 'number' &&
    typeof candidate.retriedCount === 'number' &&
    typeof candidate.deadLetteredCount === 'number'
  );
}

function isOptionalNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}
