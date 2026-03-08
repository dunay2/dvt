import type { IBackoffCalculator } from '../contracts/IBackoffCalculator.js';
import type { IClock } from '../contracts/IClock.js';
import type { IOutboxStore } from '../contracts/IOutboxStore.js';
import type { ClaimedOutboxRecord } from '../types.js';
import type { DeliveryCommand } from './DeliveryCommand.js';

export class DeliveryOutcomeWriter {
  constructor(
    private readonly store: IOutboxStore,
    private readonly clock: IClock,
    private readonly backoffCalculator: IBackoffCalculator
  ) {}

  async write(record: ClaimedOutboxRecord, command: DeliveryCommand): Promise<void> {
    const now = this.clock.now();

    switch (command.kind) {
      case 'ACK_DELIVERED':
        await this.store.ackDelivered({
          recordId: record.recordId,
          now,
          leaseOwnerId: record.leaseOwnerId,
          receipt: command.receipt,
        });
        return;
      case 'ACK_IGNORED':
        await this.store.ackIgnored({
          recordId: record.recordId,
          now,
          leaseOwnerId: record.leaseOwnerId,
          reasonCode: command.reasonCode,
          detail: command.detail,
        });
        return;
      case 'MOVE_TO_DLQ':
        await this.store.moveToDeadLetter({
          recordId: record.recordId,
          now,
          leaseOwnerId: record.leaseOwnerId,
          reasonCode: command.reasonCode,
          detail: command.detail,
        });
        return;
      case 'SCHEDULE_RETRY': {
        const nextAttemptAt = this.backoffCalculator.computeNextAttempt({
          attemptNumber: record.attemptCount,
          firstAttemptAt: record.createdAt,
          now,
        });
        await this.store.scheduleRetry({
          recordId: record.recordId,
          now,
          nextAttemptAt,
          leaseOwnerId: record.leaseOwnerId,
          reasonCode: command.reasonCode,
          detail: command.detail,
        });
        return;
      }
    }
  }
}
