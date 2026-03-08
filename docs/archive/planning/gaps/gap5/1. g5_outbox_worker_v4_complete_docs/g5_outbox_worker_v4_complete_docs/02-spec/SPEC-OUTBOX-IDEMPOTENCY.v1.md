---
title: SPEC-OUTBOX-IDEMPOTENCY v1
status: Draft
owner: architecture
last_reviewed: 2026-03-08
---

# SPEC-OUTBOX-IDEMPOTENCY v1

## 1. Core rule

The polling worker provides **at-least-once** delivery, not exactly-once.

Therefore, every subscriber must treat `headers.idempotencyKey` as the primary
deduplication key for downstream side effects.

## 2. Why this is required

The worker can legitimately redeliver the same record when a crash or timeout
happens after the side effect but before the worker persists `markDelivered`.

That window cannot be eliminated by the worker alone without much stronger
distributed guarantees.

## 3. Worker obligations

The worker must:

- preserve `headers.idempotencyKey`,
- preserve `messageId`,
- preserve `correlationId`,
- not mutate the logical meaning of the message across retries.

The worker does **not**:

- maintain cross-record deduplication state by idempotency key,
- check whether another record with the same key already completed,
- guarantee single delivery to the subscriber.

## 4. Subscriber obligations

A subscriber must implement one of these patterns:

### A. Idempotent write in the target system

Examples:

- `insert ... on conflict do nothing`,
- upsert by business key,
- replace/merge semantics keyed by idempotency key.

### B. Deduplication table

Store the processed `idempotencyKey` before or atomically with the side effect.

### C. Natural idempotency

Safe overwrite or deterministic compaction where repeated delivery does not
change the final state.

## 5. Contract note

Two different outbox records may share the same `idempotencyKey` intentionally.
That does not mean the worker should suppress one of them.  
Deduplication scope belongs to the subscriber and its target side effect model.

## 6. Example subscriber pattern

```ts
export class SnapshotProjectorSubscriber implements IOutboxSubscriber {
  readonly subscriberKey = 'snapshot-projector';
  readonly acceptedTopics = ['workflow.snapshot.project'] as const;
  readonly maxConcurrency = 4;

  async deliver(input: DeliverOutboxEventInput): Promise<DeliveryResult> {
    const inserted = await this.processedKeyStore.tryInsert(input.headers.idempotencyKey);

    if (!inserted) {
      return { kind: 'IGNORED', reasonCode: 'DUPLICATE_IDEMPOTENCY_KEY' };
    }

    await this.projector.apply(input.payload);

    return { kind: 'DELIVERED' };
  }
}
```

## 7. Test requirement

Every subscriber package must include at least one integration test that proves:

- first delivery succeeds,
- duplicate delivery with the same `idempotencyKey` does not produce a second
  external side effect.
