import type { DeliveryResult } from '../contracts/DeliveryResult.js';
import type { ClaimedOutboxRecord } from '../types.js';
import type { DeliveryCommand } from './DeliveryCommand.js';

export class DeliveryOutcomeDecider {
  decide(record: ClaimedOutboxRecord, result: DeliveryResult): DeliveryCommand {
    switch (result.kind) {
      case 'DELIVERED':
        return { kind: 'ACK_DELIVERED', receipt: result.receipt };
      case 'IGNORED':
        return {
          kind: 'ACK_IGNORED',
          reasonCode: result.reasonCode,
          detail: result.detail,
        };
      case 'TERMINAL_FAILURE':
        return {
          kind: 'MOVE_TO_DLQ',
          source: 'TERMINAL_FAILURE',
          reasonCode: result.reasonCode,
          detail: result.detail,
        };
      case 'RETRYABLE_FAILURE':
        return record.attemptCount >= record.maxAttempts
          ? {
              kind: 'MOVE_TO_DLQ',
              source: 'RETRY_EXHAUSTED',
              reasonCode: result.reasonCode,
              detail: result.detail,
            }
          : {
              kind: 'SCHEDULE_RETRY',
              reasonCode: result.reasonCode,
              detail: result.detail,
            };
    }
  }
}
