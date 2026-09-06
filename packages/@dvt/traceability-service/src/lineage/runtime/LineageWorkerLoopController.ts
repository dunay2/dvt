/**
 * @file packages/@dvt/traceability-service/src/lineage/runtime/LineageWorkerLoopController.ts
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Own lineage worker lifecycle loop, abort cleanup, and backoff without owning tick semantics
 * @consequence The public lineage runtime remains a compatibility facade while loop mechanics are independently testable
 * @version 0.1.0
 */
import { setTimeout as sleep } from 'node:timers/promises';

import { isLineageAbortError, toLineageErrorLike } from '../errorSupport.js';
import type { LineageWorkerRuntimeLogger } from '../LineageWorkerRuntime.js';

export interface LineageWorkerLoopControllerOptions {
  batchSize: number;
  errorBackoffMs: number;
  logger: LineageWorkerRuntimeLogger;
  pollIntervalMs: number;
  runTick: () => Promise<unknown>;
}

export class LineageWorkerLoopController {
  private loopPromise: Promise<void> | null = null;
  private waitController: globalThis.AbortController | null = null;
  private running = false;
  private detachAbortListener: (() => void) | null = null;

  constructor(private readonly options: LineageWorkerLoopControllerOptions) {}

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

  private async runLoop(): Promise<void> {
    const { batchSize, errorBackoffMs, logger, pollIntervalMs } = this.options;
    logger.info(
      {
        batchSize,
        pollIntervalMs,
        errorBackoffMs,
      },
      'lineage worker runtime started'
    );

    try {
      while (this.running) {
        const shouldContinue = await this.runLoopIteration();
        if (!shouldContinue) break;
      }
    } finally {
      logger.info({}, 'lineage worker runtime stopped');
    }
  }

  private async runLoopIteration(): Promise<boolean> {
    try {
      await this.options.runTick();
    } catch (err) {
      if (!this.running) return false;
      this.options.logger.error(
        { err: toLineageErrorLike(err), backoffMs: this.options.errorBackoffMs },
        'lineage worker tick failed'
      );
      await this.wait(this.options.errorBackoffMs);
      return this.running;
    }

    if (!this.running) return false;
    await this.wait(this.options.pollIntervalMs);
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
