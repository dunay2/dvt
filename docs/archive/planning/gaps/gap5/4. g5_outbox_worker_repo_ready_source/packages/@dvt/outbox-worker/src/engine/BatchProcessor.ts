import pLimit from 'p-limit';
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
    private readonly maxConcurrency: number,
  ) {}

  async process(records: readonly ClaimedOutboxRecord[]): Promise<BatchProcessingReport> {
    const limit = pLimit(this.maxConcurrency);
    const tasks = records.map((record) => limit(async () => this.coordinator.execute(record)));
    const settled = await Promise.allSettled(tasks);

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
}
