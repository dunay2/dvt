import type {
  AckDeliveredInput,
  AckIgnoredInput,
  ClaimNextBatchInput,
  IOutboxStore,
  MoveToDeadLetterInput,
  ReleaseLeaseInput,
  ScheduleRetryInput,
} from '../contracts/IOutboxStore.js';
import type { ClaimedOutboxRecord, OutboxRecord, RecordStatus } from '../types.js';

interface MutableRecord {
  recordId: string;
  topic: string;
  deliveryChannel: string;
  sideEffectKind: string;
  payload: Readonly<Record<string, unknown>>;
  headers: Readonly<Record<string, string>>;
  idempotencyKey: string;
  partitionKey: string | null;
  orderingKey: string | null;
  createdAt: Date;
  dueAt: Date;
  attemptCount: number;
  maxAttempts: number;
  status: RecordStatus;
  leaseOwnerId?: string;
  leaseExpiresAt?: Date;
  lastReasonCode?: string;
  lastDetail?: string;
}

export class InMemoryOutboxStore implements IOutboxStore {
  private readonly records = new Map<string, MutableRecord>();

  append(record: OutboxRecord): void {
    if (this.records.has(record.recordId)) {
      throw new Error(`duplicate outbox record ${record.recordId}`);
    }
    this.records.set(record.recordId, { ...record });
  }

  getRecord(recordId: string): OutboxRecord | undefined {
    const record = this.records.get(recordId);
    return record === undefined ? undefined : this.toOutboxRecord(record);
  }

  listRecords(): readonly OutboxRecord[] {
    return Array.from(this.records.values()).map((record) => this.toOutboxRecord(record));
  }

  async claimNextBatch(input: ClaimNextBatchInput): Promise<readonly ClaimedOutboxRecord[]> {
    const selected = Array.from(this.records.values())
      .filter((record) => this.isClaimable(record, input))
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .slice(0, input.batchSize);

    const claimed: ClaimedOutboxRecord[] = [];

    for (const record of selected) {
      record.status = 'leased';
      record.leaseOwnerId = input.leaseOwnerId;
      record.leaseExpiresAt = new Date(input.now.getTime() + input.leaseDurationMs);
      record.attemptCount = record.attemptCount + 1;
      claimed.push(this.toClaimed(record));
    }

    return claimed;
  }

  async ackDelivered(input: AckDeliveredInput): Promise<void> {
    const record = this.requireOwnedRecord(input.recordId, input.leaseOwnerId);
    record.status = 'delivered';
    record.dueAt = input.now;
    record.leaseOwnerId = undefined;
    record.leaseExpiresAt = undefined;
  }

  async ackIgnored(input: AckIgnoredInput): Promise<void> {
    const record = this.requireOwnedRecord(input.recordId, input.leaseOwnerId);
    record.status = 'ignored';
    record.dueAt = input.now;
    record.lastReasonCode = input.reasonCode;
    record.lastDetail = input.detail;
    record.leaseOwnerId = undefined;
    record.leaseExpiresAt = undefined;
  }

  async scheduleRetry(input: ScheduleRetryInput): Promise<void> {
    const record = this.requireOwnedRecord(input.recordId, input.leaseOwnerId);
    record.status = 'retry_scheduled';
    record.dueAt = input.nextAttemptAt;
    record.lastReasonCode = input.reasonCode;
    record.lastDetail = input.detail;
    record.leaseOwnerId = undefined;
    record.leaseExpiresAt = undefined;
  }

  async moveToDeadLetter(input: MoveToDeadLetterInput): Promise<void> {
    const record = this.requireOwnedRecord(input.recordId, input.leaseOwnerId);
    record.status = 'dead_letter';
    record.dueAt = input.now;
    record.lastReasonCode = input.reasonCode;
    record.lastDetail = input.detail;
    record.leaseOwnerId = undefined;
    record.leaseExpiresAt = undefined;
  }

  async releaseLease(input: ReleaseLeaseInput): Promise<void> {
    const record = this.requireOwnedRecord(input.recordId, input.leaseOwnerId);
    record.status = 'pending';
    record.lastReasonCode = input.reasonCode;
    record.lastDetail = input.detail;
    record.leaseOwnerId = undefined;
    record.leaseExpiresAt = undefined;
  }

  private isClaimable(record: MutableRecord, input: ClaimNextBatchInput): boolean {
    const topicAllowed = input.topics === undefined || input.topics.includes(record.topic);
    const channelAllowed =
      input.deliveryChannels === undefined ||
      input.deliveryChannels.includes(record.deliveryChannel);
    const sideEffectAllowed =
      input.sideEffectKinds === undefined || input.sideEffectKinds.includes(record.sideEffectKind);

    if (!topicAllowed || !channelAllowed || !sideEffectAllowed) {
      return false;
    }

    if (record.status === 'pending' || record.status === 'retry_scheduled') {
      return record.dueAt.getTime() <= input.now.getTime();
    }

    if (record.status === 'leased') {
      return (
        record.leaseExpiresAt !== undefined &&
        record.leaseExpiresAt.getTime() <= input.now.getTime()
      );
    }

    return false;
  }

  private requireOwnedRecord(recordId: string, leaseOwnerId: string): MutableRecord {
    const record = this.records.get(recordId);
    if (record === undefined) {
      throw new Error(`missing outbox record ${recordId}`);
    }

    if (record.status !== 'leased' || record.leaseOwnerId !== leaseOwnerId) {
      throw new Error(`outbox record ${recordId} is not leased by ${leaseOwnerId}`);
    }

    return record;
  }

  private toClaimed(record: MutableRecord): ClaimedOutboxRecord {
    if (record.leaseOwnerId === undefined || record.leaseExpiresAt === undefined) {
      throw new Error(`record ${record.recordId} is missing lease metadata`);
    }

    return {
      recordId: record.recordId,
      topic: record.topic,
      deliveryChannel: record.deliveryChannel,
      sideEffectKind: record.sideEffectKind,
      payload: record.payload,
      headers: record.headers,
      idempotencyKey: record.idempotencyKey,
      partitionKey: record.partitionKey,
      orderingKey: record.orderingKey,
      createdAt: record.createdAt,
      dueAt: record.dueAt,
      attemptCount: record.attemptCount,
      maxAttempts: record.maxAttempts,
      status: 'leased',
      leaseOwnerId: record.leaseOwnerId,
      leaseExpiresAt: record.leaseExpiresAt,
    };
  }

  private toOutboxRecord(record: MutableRecord): OutboxRecord {
    return {
      recordId: record.recordId,
      topic: record.topic,
      deliveryChannel: record.deliveryChannel,
      sideEffectKind: record.sideEffectKind,
      payload: record.payload,
      headers: record.headers,
      idempotencyKey: record.idempotencyKey,
      partitionKey: record.partitionKey,
      orderingKey: record.orderingKey,
      createdAt: record.createdAt,
      dueAt: record.dueAt,
      attemptCount: record.attemptCount,
      maxAttempts: record.maxAttempts,
      status: record.status,
    };
  }
}
