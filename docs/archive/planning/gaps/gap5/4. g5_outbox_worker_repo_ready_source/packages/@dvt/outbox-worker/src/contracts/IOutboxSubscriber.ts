import type { ClaimedOutboxRecord, DeliveryChannel, SideEffectKind, TopicName } from '../types.js';
import type { DeliveryResult } from './DeliveryResult.js';

export interface OutboxSubscriberRegistration {
  readonly subscriberKey: string;
  readonly topic: TopicName;
  readonly deliveryChannel: DeliveryChannel;
  readonly sideEffectKind: SideEffectKind;
  readonly maxConcurrency: number;
}

export interface DeliverOutboxRecordInput {
  readonly record: ClaimedOutboxRecord;
}

export interface IOutboxSubscriber {
  readonly registration: OutboxSubscriberRegistration;
  deliver(input: DeliverOutboxRecordInput): Promise<DeliveryResult>;
}
