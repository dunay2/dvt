import type {
  DeliverOutboxRecordInput,
  IOutboxSubscriber,
  OutboxSubscriberRegistration,
} from '../contracts/IOutboxSubscriber.js';
import type { DeliveryResult } from '../contracts/DeliveryResult.js';

export interface IdempotentSink {
  apply(idempotencyKey: string, payload: Readonly<Record<string, unknown>>): boolean;
  appliedCount(): number;
}

export class SetBasedIdempotentSink implements IdempotentSink {
  private readonly keys = new Set<string>();

  apply(idempotencyKey: string, _payload: Readonly<Record<string, unknown>>): boolean {
    const alreadySeen = this.keys.has(idempotencyKey);
    if (!alreadySeen) {
      this.keys.add(idempotencyKey);
    }
    return !alreadySeen;
  }

  appliedCount(): number {
    return this.keys.size;
  }
}

export class TestSubscriber implements IOutboxSubscriber {
  constructor(
    public readonly registration: OutboxSubscriberRegistration,
    private readonly sink: IdempotentSink
  ) {}

  async deliver(input: DeliverOutboxRecordInput): Promise<DeliveryResult> {
    this.sink.apply(input.record.idempotencyKey, input.record.payload);
    return { kind: 'DELIVERED', receipt: input.record.recordId };
  }
}
