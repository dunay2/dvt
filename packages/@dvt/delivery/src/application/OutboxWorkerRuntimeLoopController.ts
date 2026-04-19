import { setTimeout as sleep } from 'node:timers/promises';

import type { OutboxWorkerRuntimeLogger } from './OutboxWorkerRuntime.js';
import {
  isOutboxWorkerRuntimeAbortError,
  toOutboxWorkerRuntimeErrorLike,
} from './outboxWorkerRuntimeErrorSupport.js';

interface OutboxWorkerRuntimeLoopControllerArgs {
  interruptPendingTick?: () => void | Promise<void>;
  logger: OutboxWorkerRuntimeLogger;
}

export class OutboxWorkerRuntimeLoopController {
  private readonly interruptPendingTick: (() => void | Promise<void>) | undefined;
  private loopPromise: Promise<void> | null = null;
  private waitController: globalThis.AbortController | null = null;
  private running = false;
  private detachAbortListener: (() => void) | null = null;

  constructor(private readonly args: OutboxWorkerRuntimeLoopControllerArgs) {
    this.interruptPendingTick = args.interruptPendingTick;
  }

  isRunning(): boolean {
    return this.running;
  }

  start(runLoop: () => Promise<void>, signal?: globalThis.AbortSignal): Promise<void> {
    if (this.loopPromise !== null) {
      return this.loopPromise;
    }

    this.running = true;
    if (!this.bindAbortSignal(signal)) {
      return Promise.resolve();
    }

    this.loopPromise = runLoop().finally(() => {
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
    await this.interruptTick();

    if (loopPromise !== null) {
      try {
        await loopPromise;
      } catch {
        // The runtime start path is responsible for surfacing loop failures.
      }
    }
  }

  async wait(delayMs: number): Promise<void> {
    const controller = new globalThis.AbortController();
    this.waitController = controller;
    try {
      await sleep(delayMs, undefined, { signal: controller.signal });
    } catch (error) {
      if (!isOutboxWorkerRuntimeAbortError(error)) {
        throw error;
      }
    } finally {
      if (this.waitController === controller) {
        this.waitController = null;
      }
    }
  }

  private bindAbortSignal(signal?: globalThis.AbortSignal): boolean {
    if (!signal) {
      return this.running;
    }

    const onAbort = (): void => {
      void this.stop();
    };
    signal.addEventListener('abort', onAbort, { once: true });
    this.detachAbortListener = () => signal.removeEventListener('abort', onAbort);

    if (signal.aborted) {
      this.running = false;
      this.detachAbortListener();
      this.detachAbortListener = null;
    }

    return this.running;
  }

  private async interruptTick(): Promise<void> {
    if (!this.interruptPendingTick) {
      return;
    }

    try {
      await this.interruptPendingTick();
    } catch (error) {
      this.args.logger.warn?.(
        { err: toOutboxWorkerRuntimeErrorLike(error) },
        'outbox runtime failed to interrupt an in-flight tick'
      );
    }
  }
}
