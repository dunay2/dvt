import type { DeliveryResult } from '../contracts/DeliveryResult.js';
import type { ClaimedOutboxRecord } from '../types.js';
import type { DeliveryCommand } from './DeliveryCommand.js';

export class DeliveryOutcomeDecider {
  decide(record: ClaimedOutboxRecord, result: DeliveryResult): DeliveryCommand {
    switch (result.kind) {
      case 'DELIVERED':
        return this.ackDelivered(result);
      case 'IGNORED':
        return this.ackIgnored(result);
      case 'TERMINAL_FAILURE':
        return this.moveToDlq('TERMINAL_FAILURE', result);
      case 'RETRYABLE_FAILURE':
        if (record.attemptCount >= record.maxAttempts) {
          return this.moveToDlq('RETRY_EXHAUSTED', result);
        }

        return this.scheduleRetry(result);
    }
  }

  private ackDelivered(
    result: Extract<DeliveryResult, { readonly kind: 'DELIVERED' }>
  ): DeliveryCommand {
    if (result.receipt === undefined) {
      return { kind: 'ACK_DELIVERED' };
    }

    return { kind: 'ACK_DELIVERED', receipt: result.receipt };
  }

  private ackIgnored(
    result: Extract<DeliveryResult, { readonly kind: 'IGNORED' }>
  ): DeliveryCommand {
    if (result.detail === undefined) {
      return {
        kind: 'ACK_IGNORED',
        reasonCode: result.reasonCode,
      };
    }

    return {
      kind: 'ACK_IGNORED',
      reasonCode: result.reasonCode,
      detail: result.detail,
    };
  }

  private moveToDlq(
    source: Extract<DeliveryCommand, { readonly kind: 'MOVE_TO_DLQ' }>['source'],
    result: Extract<
      DeliveryResult,
      { readonly kind: 'TERMINAL_FAILURE' } | { readonly kind: 'RETRYABLE_FAILURE' }
    >
  ): DeliveryCommand {
    if (result.detail === undefined) {
      return {
        kind: 'MOVE_TO_DLQ',
        source,
        reasonCode: result.reasonCode,
      };
    }

    return {
      kind: 'MOVE_TO_DLQ',
      source,
      reasonCode: result.reasonCode,
      detail: result.detail,
    };
  }

  private scheduleRetry(
    result: Extract<DeliveryResult, { readonly kind: 'RETRYABLE_FAILURE' }>
  ): DeliveryCommand {
    if (result.detail === undefined) {
      return {
        kind: 'SCHEDULE_RETRY',
        reasonCode: result.reasonCode,
      };
    }

    return {
      kind: 'SCHEDULE_RETRY',
      reasonCode: result.reasonCode,
      detail: result.detail,
    };
  }
}
