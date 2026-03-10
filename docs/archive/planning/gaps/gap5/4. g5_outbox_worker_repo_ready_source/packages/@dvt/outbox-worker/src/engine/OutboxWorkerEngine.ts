import type { IClock } from '../contracts/IClock.js';
import type { ClaimNextBatchInput } from '../contracts/IOutboxStore.js';
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
    private readonly config: OutboxWorkerEngineConfig
  ) {}

  async processBatch(): Promise<BatchProcessingReport> {
    const claimed = await this.store.claimNextBatch(this.buildClaimNextBatchInput());

    this.telemetry.onClaimBatch(claimed.length);

    if (claimed.length === 0) {
      return {
        claimedCount: 0,
        processedCount: 0,
      };
    }

    return this.batchProcessor.process(claimed);
  }

  private buildClaimNextBatchInput(): ClaimNextBatchInput {
    const input: ClaimNextBatchInput = {
      now: this.clock.now(),
      leaseOwnerId: this.config.leaseOwnerId,
      batchSize: this.config.batchSize,
      leaseDurationMs: this.config.leaseDurationMs,
    };

    if (this.config.topics !== undefined) {
      return {
        ...input,
        topics: this.config.topics,
        ...(this.config.deliveryChannels !== undefined
          ? { deliveryChannels: this.config.deliveryChannels }
          : {}),
        ...(this.config.sideEffectKinds !== undefined
          ? { sideEffectKinds: this.config.sideEffectKinds }
          : {}),
      };
    }

    if (this.config.deliveryChannels !== undefined) {
      return {
        ...input,
        deliveryChannels: this.config.deliveryChannels,
        ...(this.config.sideEffectKinds !== undefined
          ? { sideEffectKinds: this.config.sideEffectKinds }
          : {}),
      };
    }

    if (this.config.sideEffectKinds !== undefined) {
      return {
        ...input,
        sideEffectKinds: this.config.sideEffectKinds,
      };
    }

    return input;
  }
}
