import type { ILogger } from '../contracts/ILogger.js';
import type { IWakeupSignal } from '../contracts/IWakeupSignal.js';
import type { BatchProcessingReport } from '../engine/BatchProcessor.js';
import { OutboxWorkerEngine } from '../engine/OutboxWorkerEngine.js';

export interface OutboxWorkerRuntimeConfig {
  readonly idleDelayMs: number;
}

export class OutboxWorkerRuntime {
  private acceptingNewWork = true;

  constructor(
    private readonly engine: OutboxWorkerEngine,
    private readonly wakeupSignal: IWakeupSignal,
    private readonly logger: ILogger,
    private readonly config: OutboxWorkerRuntimeConfig
  ) {}

  stopAcceptingNewWork(): void {
    this.acceptingNewWork = false;
  }

  async tickOnce(): Promise<BatchProcessingReport> {
    if (!this.acceptingNewWork) {
      return { claimedCount: 0, processedCount: 0 };
    }

    return this.engine.processBatch();
  }

  async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted && this.acceptingNewWork) {
      const report = await this.tickOnce();
      if (report.claimedCount === 0) {
        try {
          await this.wakeupSignal.waitForWakeupOrTimeout(this.config.idleDelayMs, signal);
        } catch (error) {
          if (signal.aborted) {
            return;
          }
          throw error;
        }
      }
    }

    this.logger.info('outbox runtime stopped', { acceptingNewWork: this.acceptingNewWork });
  }
}
