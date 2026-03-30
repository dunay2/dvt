import { setTimeout as sleep } from 'node:timers/promises';

export interface RunEventRetentionRuntimeLogger {
  info(data: Record<string, unknown>, msg?: string): void;
  error(data: Record<string, unknown>, msg?: string): void;
}

/**
 * Periodic scheduler for run-event retention archival cycles.
 *
 * Runs one cycle immediately on start() and then repeats every interval.
 * Errors are logged and do not stop the loop.
 */
export class RunEventRetentionRuntime {
  private loopPromise: Promise<void> | null = null;
  private running = false;
  private waitController: globalThis.AbortController | null = null;
  private cycleController: globalThis.AbortController | null = null;
  private initialDelayController: globalThis.AbortController | null = null;
  private detachAbortListener: (() => void) | null = null;

  constructor(
    private readonly runRetentionCycle: (signal: globalThis.AbortSignal) => Promise<unknown>,
    private readonly intervalMs: number,
    private readonly initialDelayMs: number,
    private readonly logger: RunEventRetentionRuntimeLogger
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
      this.initialDelayController = null;
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
    this.cycleController?.abort();
    this.initialDelayController?.abort();
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
    this.logger.info({}, 'run event retention runtime started');

    if (this.running && this.initialDelayMs > 0) {
      this.initialDelayController = new globalThis.AbortController();
      try {
        await sleep(this.initialDelayMs, undefined, { signal: this.initialDelayController.signal });
      } catch {
        // AbortError from stop() - do not execute a cycle.
      } finally {
        this.initialDelayController = null;
      }
    }

    while (this.running) {
      this.cycleController = new globalThis.AbortController();
      try {
        await this.runRetentionCycle(this.cycleController.signal);
      } catch (err) {
        if (!(isAbortError(err) && !this.running)) {
          this.logger.error({ err }, 'run event retention cycle failed');
        }
      } finally {
        this.cycleController = null;
      }

      if (!this.running) break;

      this.waitController = new globalThis.AbortController();
      try {
        await sleep(this.intervalMs, undefined, { signal: this.waitController.signal });
      } catch {
        // AbortError from stop() - exit loop.
      } finally {
        this.waitController = null;
      }
    }

    this.logger.info({}, 'run event retention runtime stopped');
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
