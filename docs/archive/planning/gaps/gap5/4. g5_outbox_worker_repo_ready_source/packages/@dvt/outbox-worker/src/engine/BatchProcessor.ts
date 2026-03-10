import type { ClaimedOutboxRecord } from '../types.js';
import { CrashWindowInjectedError } from '../delivery/CrashWindowInjectedError.js';
import { DeliveryCoordinator } from '../delivery/DeliveryCoordinator.js';

export interface BatchProcessingReport {
  readonly claimedCount: number;
  readonly processedCount: number;
}

export class BatchProcessor {
  constructor(
    private readonly coordinator: DeliveryCoordinator,
    private readonly maxConcurrency: number
  ) {}

  async process(records: readonly ClaimedOutboxRecord[]): Promise<BatchProcessingReport> {
    const settled = await Promise.allSettled(this.createWorkers(records));

    const fatal = settled.find((item) => item.status === 'rejected');
    if (fatal?.status === 'rejected') {
      const reason = fatal.reason;
      if (reason instanceof CrashWindowInjectedError) {
        throw reason;
      }
      throw reason instanceof Error ? reason : new Error('unknown batch processing failure');
    }

    return {
      claimedCount: records.length,
      processedCount: records.length,
    };
  }

  private createWorkers(records: readonly ClaimedOutboxRecord[]): Promise<void>[] {
    const recordQueue = [...records];
    const workerCount = Math.min(records.length, Math.max(this.maxConcurrency, 1));

    return Array.from({ length: workerCount }, async (): Promise<void> => {
      while (recordQueue.length > 0) {
        const record = recordQueue.shift();
        if (record === undefined) {
          return;
        }

        await this.coordinator.execute(record);
      }
    });
  }
}
