import { setTimeout as sleep } from 'node:timers/promises';

export interface DeliveryBufferPurgeRuntimeLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
}

/**
 * Periodic scheduler that calls a purge function on a fixed interval.
 *
 * The first purge cycle runs immediately when start() is called so that rows
 * are not held for a full interval after deployment. Subsequent cycles are
 * separated by intervalMs. Each cycle is fail-soft: an error is logged but
 * does not stop the loop.
 *
 * start() returns a Promise that resolves when the loop exits (i.e. after
 * stop() is called or the signal aborts), matching the RuntimeHandle contract
 * used by createOutboxWorkerRuntime.
 */
export class DeliveryBufferPurgeRuntime {
  private loopPromise: Promise<void> | null = null;
  private running = false;
  private waitController: globalThis.AbortController | null = null;
  private detachAbortListener: (() => void) | null = null;

  constructor(
    private readonly purge: () => Promise<unknown>,
    private readonly intervalMs: number,
    private readonly logger: DeliveryBufferPurgeRuntimeLogger
  ) {}

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
    this.logger.info({}, 'delivery buffer purge runtime started');

    while (this.running) {
      try {
        await this.purge();
      } catch (err) {
        this.logger.error({ err }, 'delivery buffer purge cycle failed');
      }

      if (!this.running) break;

      this.waitController = new globalThis.AbortController();
      try {
        await sleep(this.intervalMs, undefined, { signal: this.waitController.signal });
      } catch {
        // AbortError from stop() — exit the loop.
      } finally {
        this.waitController = null;
      }
    }

    this.logger.info({}, 'delivery buffer purge runtime stopped');
  }
}
