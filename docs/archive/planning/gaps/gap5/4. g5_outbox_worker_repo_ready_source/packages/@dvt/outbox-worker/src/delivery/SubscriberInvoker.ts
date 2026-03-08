import type { DeliveryResult } from '../contracts/DeliveryResult.js';
import type { IOutboxSubscriber } from '../contracts/IOutboxSubscriber.js';
import type { ClaimedOutboxRecord } from '../types.js';

export class SubscriberInvoker {
  async invoke(subscriber: IOutboxSubscriber, record: ClaimedOutboxRecord): Promise<DeliveryResult> {
    try {
      return await subscriber.deliver({ record });
    } catch (error) {
      return {
        kind: 'TERMINAL_FAILURE',
        reasonCode: 'SUBSCRIBER_UNEXPECTED_THROW',
        detail: error instanceof Error ? error.message : 'unknown throw',
      };
    }
  }
}
