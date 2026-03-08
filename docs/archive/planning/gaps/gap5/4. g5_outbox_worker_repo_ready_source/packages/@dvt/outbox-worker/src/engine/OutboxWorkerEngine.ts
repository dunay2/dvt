import type { IClock } from '../contracts/IClock.js';
import type { IOutboxStore } from '../contracts/IOutboxStore.js';
import { DeliveryTelemetry } from '../delivery/DeliveryTelemetry.js';
import { BatchProcessor, type BatchProcessingReport } from './BatchProcessor.js';
import type { TopicName, DeliveryChannel, SideEffectKind } from '../types.js';

export interface OutboxWorkerEngineConfig {
  readonly leaseOwnerId: string;
  readonly batchSize: number;
  readonly leaseDurationMs: number;
  readonly topics?: readonly TopicName[];
  readonly deliveryChannels?: readonly DeliveryChannel[];
  readonly sideEffectKinds?: readonly SideEffectKind[];
}

export class OutboxWorkerEngine {
  constructor(
    private readonly store: IOutboxStore,
    private readonly batchProcessor: BatchProcessor,
    private readonly telemetry: DeliveryTelemetry,
    private readonly clock: IClock,
    private readonly config: OutboxWorkerEngineConfig,
  ) {}

  async processBatch(): Promise<BatchProcessingReport> {
    const claimed = await this.store.claimNextBatch({
      now: this.clock.now(),
      leaseOwnerId: this.config.leaseOwnerId,
      batchSize: this.config.batchSize,
      leaseDurationMs: this.config.leaseDurationMs,
      topics: this.config.topics,
      deliveryChannels: this.config.deliveryChannels,
      sideEffectKinds: this.config.sideEffectKinds,
    });

    this.telemetry.onClaimBatch(claimed.length);

    if (claimed.length === 0) {
      return {
        claimedCount: 0,
        processedCount: 0,
      };
    }

    return this.batchProcessor.process(claimed);
  }
}
