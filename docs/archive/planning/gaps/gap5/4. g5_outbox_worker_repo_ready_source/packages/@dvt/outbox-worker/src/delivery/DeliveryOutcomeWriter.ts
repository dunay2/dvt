import type { IBackoffCalculator } from '../contracts/IBackoffCalculator.js';
import type { IClock } from '../contracts/IClock.js';
import type {
  AckDeliveredInput,
  AckIgnoredInput,
  MoveToDeadLetterInput,
  ScheduleRetryInput,
} from '../contracts/IOutboxStore.js';
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
        await this.store.ackDelivered(this.buildAckDeliveredInput(record, now, command));
        return;
      case 'ACK_IGNORED':
        await this.store.ackIgnored(this.buildAckIgnoredInput(record, now, command));
        return;
      case 'MOVE_TO_DLQ':
        await this.store.moveToDeadLetter(this.buildMoveToDeadLetterInput(record, now, command));
        return;
      case 'SCHEDULE_RETRY': {
        const nextAttemptAt = this.backoffCalculator.computeNextAttempt({
          attemptNumber: record.attemptCount,
          firstAttemptAt: record.createdAt,
          now,
        });
        await this.store.scheduleRetry(
          this.buildScheduleRetryInput(record, now, nextAttemptAt, command)
        );
        return;
      }
    }
  }

  private buildAckDeliveredInput(
    record: ClaimedOutboxRecord,
    now: Date,
    command: Extract<DeliveryCommand, { readonly kind: 'ACK_DELIVERED' }>
  ): AckDeliveredInput {
    if (command.receipt === undefined) {
      return {
        recordId: record.recordId,
        now,
        leaseOwnerId: record.leaseOwnerId,
      };
    }

    return {
      recordId: record.recordId,
      now,
      leaseOwnerId: record.leaseOwnerId,
      receipt: command.receipt,
    };
  }

  private buildAckIgnoredInput(
    record: ClaimedOutboxRecord,
    now: Date,
    command: Extract<DeliveryCommand, { readonly kind: 'ACK_IGNORED' }>
  ): AckIgnoredInput {
    if (command.detail === undefined) {
      return {
        recordId: record.recordId,
        now,
        leaseOwnerId: record.leaseOwnerId,
        reasonCode: command.reasonCode,
      };
    }

    return {
      recordId: record.recordId,
      now,
      leaseOwnerId: record.leaseOwnerId,
      reasonCode: command.reasonCode,
      detail: command.detail,
    };
  }

  private buildMoveToDeadLetterInput(
    record: ClaimedOutboxRecord,
    now: Date,
    command: Extract<DeliveryCommand, { readonly kind: 'MOVE_TO_DLQ' }>
  ): MoveToDeadLetterInput {
    if (command.detail === undefined) {
      return {
        recordId: record.recordId,
        now,
        leaseOwnerId: record.leaseOwnerId,
        reasonCode: command.reasonCode,
      };
    }

    return {
      recordId: record.recordId,
      now,
      leaseOwnerId: record.leaseOwnerId,
      reasonCode: command.reasonCode,
      detail: command.detail,
    };
  }

  private buildScheduleRetryInput(
    record: ClaimedOutboxRecord,
    now: Date,
    nextAttemptAt: Date,
    command: Extract<DeliveryCommand, { readonly kind: 'SCHEDULE_RETRY' }>
  ): ScheduleRetryInput {
    if (command.detail === undefined) {
      return {
        recordId: record.recordId,
        now,
        nextAttemptAt,
        leaseOwnerId: record.leaseOwnerId,
        reasonCode: command.reasonCode,
      };
    }

    return {
      recordId: record.recordId,
      now,
      nextAttemptAt,
      leaseOwnerId: record.leaseOwnerId,
      reasonCode: command.reasonCode,
      detail: command.detail,
    };
  }
}
