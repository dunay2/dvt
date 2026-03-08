import type { ClaimedOutboxRecord } from '../types.js';
import type { IOutboxSubscriber } from '../contracts/IOutboxSubscriber.js';
import { SubscriberRegistry } from './SubscriberRegistry.js';

export class SubscriberResolver {
  constructor(private readonly registry: SubscriberRegistry) {}

  resolve(record: ClaimedOutboxRecord): IOutboxSubscriber {
    const subscriber = this.registry.get(record.topic, record.deliveryChannel, record.sideEffectKind);
    if (subscriber === null) {
      throw new Error(
        `no subscriber for tuple ${record.topic}/${record.deliveryChannel}/${record.sideEffectKind}`,
      );
    }

    return subscriber;
  }
}
