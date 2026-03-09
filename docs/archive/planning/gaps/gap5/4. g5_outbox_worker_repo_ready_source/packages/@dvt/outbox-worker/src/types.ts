export type DeliveryChannel = string;
export type SideEffectKind = string;
export type TopicName = string;
export type RecordStatus =
  | 'pending'
  | 'leased'
  | 'retry_scheduled'
  | 'delivered'
  | 'ignored'
  | 'dead_letter';

export interface OutboxRecordHeaders {
  readonly [key: string]: string;
}

export interface OutboxRecordPayload {
  readonly [key: string]: unknown;
}

export interface OutboxRecord {
  readonly recordId: string;
  readonly topic: TopicName;
  readonly deliveryChannel: DeliveryChannel;
  readonly sideEffectKind: SideEffectKind;
  readonly payload: OutboxRecordPayload;
  readonly headers: OutboxRecordHeaders;
  readonly idempotencyKey: string;
  readonly partitionKey: string | null;
  readonly orderingKey: string | null;
  readonly createdAt: Date;
  readonly dueAt: Date;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly status: RecordStatus;
}

export interface ClaimedOutboxRecord extends OutboxRecord {
  readonly status: 'leased';
  readonly leaseOwnerId: string;
  readonly leaseExpiresAt: Date;
}
