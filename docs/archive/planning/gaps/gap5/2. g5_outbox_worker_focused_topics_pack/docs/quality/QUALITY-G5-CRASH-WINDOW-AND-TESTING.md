---
title: Quality — G5 Crash Window and Testing
status: Draft
owner: docs
last_reviewed: 2026-03-08
---

# Quality — G5 Crash Window and Testing

## 1. Purpose

This document defines the test strategy for the focused review topics, with special attention to the crash window after subscriber success and before store acknowledgment.

---

## 2. Required tests

### 2.1 Coexistence policy tests

- allow polling + CDC for same topic when side effects differ,
- reject duplicated active ownership for same tuple,
- allow shadow mode with observe-only behavior.

### 2.2 Secret boundary tests

- worker runtime can be instantiated without any secret provider,
- host redaction utility removes secret-bearing fields from logs,
- adapter config logging never prints raw credentials.

### 2.3 Backoff split tests

- `DeliveryOutcomeDecider` emits `SCHEDULE_RETRY`,
- `IBackoffCalculator` determines the timestamp,
- changing backoff algorithm does not change decider tests.

### 2.4 Lane tests

- unordered mode claims records without lane table usage,
- ordered mode serializes by lane,
- expired lane leases can be reclaimed,
- hot lane metrics are exposed.

### 2.5 Crash-window tests

- subscriber success followed by crash before `markDelivered`,
- reprocessing occurs,
- idempotent subscriber sink applies logical side effect once,
- dead-letter behavior still works for terminal failures.

---

## 3. Fault injection contract

```ts
export interface ICrashWindowTestHook {
  afterSubscriberSuccessBeforeStoreWrite(input: {
    readonly outboxRecordId: string;
    readonly subscriberKey: string;
  }): Promise<void>;
}
```

Production implementation is a no-op.

Test implementations may:

- throw a sentinel error,
- terminate a fixture process,
- force connection drop before acknowledgment write.

---

## 4. Crash-window test example

### 4.1 In-process deterministic variant

```ts
it('replays after crash window and relies on subscriber idempotency', async () => {
  const sink = new IdempotentFakeSink();
  const hook: ICrashWindowTestHook = {
    async afterSubscriberSuccessBeforeStoreWrite() {
      throw new Error('CRASH_WINDOW_SENTINEL');
    },
  };

  const worker = createTestWorker({ sink, crashWindowHook: hook });

  await seedPendingOutboxRecord({
    outboxRecordId: 'r1',
    topic: 'workflow.run.events',
    payload: { idempotencyKey: 'k1' },
  });

  await expect(worker.tickOnce(abortSignalNever())).rejects.toThrow('CRASH_WINDOW_SENTINEL');

  expect(await readOutboxRecordStatus('r1')).toBe('pending');
  expect(sink.observedDeliveriesFor('k1')).toBe(1);

  const replayWorker = createTestWorker({
    sink,
    crashWindowHook: { afterSubscriberSuccessBeforeStoreWrite: async () => undefined },
  });

  await replayWorker.tickOnce(abortSignalNever());

  expect(sink.observedDeliveriesFor('k1')).toBe(2);
  expect(sink.logicalApplicationsFor('k1')).toBe(1);
  expect(await readOutboxRecordStatus('r1')).toBe('delivered');
});
```

### 4.2 Process-level integration variant

Use a fixture worker process.

1. seed one record,
2. run worker with a crash hook that calls `process.exit(99)` after subscriber success,
3. verify side effect sink received one attempt,
4. start second worker without crash hook,
5. verify second attempt occurs,
6. verify sink de-duplicates logically,
7. verify record is marked delivered.

---

## 5. What to observe in CI

The CI test report should make the delivery model obvious:

- delivery attempts may be 2,
- logical applications must be 1,
- status eventually becomes `delivered`.

That is the correct proof for at-least-once + idempotent subscriber design.
