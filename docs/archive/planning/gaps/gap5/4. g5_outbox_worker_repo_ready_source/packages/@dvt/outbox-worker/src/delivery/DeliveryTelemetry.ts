import type { ILogger } from '../contracts/ILogger.js';
import type { IOutboxWorkerMetrics } from '../contracts/IMetrics.js';
import type { ClaimedOutboxRecord } from '../types.js';
import type { DeliveryCommand } from './DeliveryCommand.js';

export class DeliveryTelemetry {
  constructor(
    private readonly logger: ILogger,
    private readonly metrics: IOutboxWorkerMetrics,
  ) {}

  onClaimBatch(claimedCount: number): void {
    this.metrics.setGauge('outbox_claimed_batch_size', claimedCount);
  }

  onCommand(record: ClaimedOutboxRecord, command: DeliveryCommand): void {
    const labels = {
      topic: record.topic,
      subscriber: `${record.deliveryChannel}:${record.sideEffectKind}`,
      side_effect_kind: record.sideEffectKind,
    };

    switch (command.kind) {
      case 'ACK_DELIVERED':
        this.metrics.incrementCounter('outbox_records_delivered_total', labels);
        break;
      case 'ACK_IGNORED':
        this.metrics.incrementCounter('outbox_records_ignored_total', labels);
        break;
      case 'SCHEDULE_RETRY':
        this.metrics.incrementCounter('outbox_records_retried_total', labels);
        break;
      case 'MOVE_TO_DLQ':
        this.metrics.incrementCounter('outbox_records_dead_lettered_total', labels);
        if (command.source === 'RETRY_EXHAUSTED') {
          this.metrics.incrementCounter('outbox_records_exhausted_retries_total', labels);
        }
        break;
    }

    this.logger.info('outbox record command emitted', {
      recordId: record.recordId,
      topic: record.topic,
      deliveryChannel: record.deliveryChannel,
      sideEffectKind: record.sideEffectKind,
      commandKind: command.kind,
    });
  }

  onRuntimeError(error: Error): void {
    this.metrics.incrementCounter('outbox_runtime_errors_total');
    this.logger.error('outbox runtime error', { message: error.message, name: error.name });
  }
}
