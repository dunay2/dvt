import { TenantId, EventId, IdempotencyKey } from '../types/contracts';

export interface OutboxEventRecord {
  readonly outboxId: string;
  readonly tenantId: TenantId;
  readonly eventId: EventId;
  readonly eventData: unknown;
  readonly targetSystem: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly createdAt: number;
  readonly deliveredAt?: number;
  readonly status: 'pending' | 'delivered' | 'failed';
}

export interface IOutboxStorageAdapter {
  appendOutbox(
    tenantId: TenantId,
    eventId: EventId,
    eventData: unknown,
    targetSystem: string,
    idempotencyKey: IdempotencyKey
  ): Promise<OutboxEventRecord>;
  pullUndelivered(tenantId: TenantId, maxEvents: number): Promise<OutboxEventRecord[]>;
  markDelivered(outboxId: string): Promise<OutboxEventRecord>;
  health(): Promise<boolean>;
  close(): Promise<void>;
}
