import type { DeliveryChannel, SideEffectKind, TopicName } from '../types.js';
import type { IOutboxSubscriber } from '../contracts/IOutboxSubscriber.js';

function makeKey(
  topic: TopicName,
  deliveryChannel: DeliveryChannel,
  sideEffectKind: SideEffectKind
): string {
  return `${topic}::${deliveryChannel}::${sideEffectKind}`;
}

export class SubscriberRegistry {
  private readonly subscribers = new Map<string, IOutboxSubscriber>();

  constructor(subscribers: readonly IOutboxSubscriber[]) {
    for (const subscriber of subscribers) {
      const key = makeKey(
        subscriber.registration.topic,
        subscriber.registration.deliveryChannel,
        subscriber.registration.sideEffectKind
      );

      if (this.subscribers.has(key)) {
        throw new Error(`duplicate subscriber registration: ${key}`);
      }

      this.subscribers.set(key, subscriber);
    }
  }

  get(
    topic: TopicName,
    deliveryChannel: DeliveryChannel,
    sideEffectKind: SideEffectKind
  ): IOutboxSubscriber | null {
    return this.subscribers.get(makeKey(topic, deliveryChannel, sideEffectKind)) ?? null;
  }
}
