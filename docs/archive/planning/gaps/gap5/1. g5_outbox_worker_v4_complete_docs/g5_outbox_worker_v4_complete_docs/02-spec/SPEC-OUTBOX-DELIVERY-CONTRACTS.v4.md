---
title: SPEC-OUTBOX-DELIVERY-CONTRACTS v4
status: Draft
owner: architecture
last_reviewed: 2026-03-08
---

# SPEC-OUTBOX-DELIVERY-CONTRACTS v4

## 1. Scope

This specification defines the polling-family delivery contracts:

- message record shape,
- subscriber contract,
- result model,
- store command/query contract,
- delivery policy contract,
- registry contract,
- wake-up contract.

It is intentionally concrete enough to implement.

## 2. Terminology

- **Outbox record**: persisted row representing one delivery attempt lifecycle.
- **Subscriber**: in-process delivery target invoked by the polling worker.
- **Delivery outcome**: typed result returned by a subscriber.
- **Lane**: serialized ordering partition.
- **Claim**: temporary worker ownership of a record.
- **Lease**: time-bounded ownership of a record or lane.

## 3. Message shape

```ts
export type OutboxMessageId = string;
export type TenantId = string;
export type OutboxTopic = 
  | 'workflow.snapshot.project'
  | 'run.event.publish'
  | 'lineage.export.requested';

export interface OutboxHeaders {
  readonly idempotencyKey: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly schemaVersion: number;
  readonly contentType: 'application/json';
}

export interface OutboxRecord<TPayload = unknown> {
  readonly id: OutboxMessageId;
  readonly tenantId: TenantId;
  readonly topic: OutboxTopic;
  readonly eventType: string;
  readonly payload: TPayload;
  readonly headers: OutboxHeaders;

  readonly deliveryFamily: 'polling' | 'cdc';
  readonly deliveryState:
    | 'PENDING'
    | 'CLAIMED'
    | 'RETRY_SCHEDULED'
    | 'DELIVERED'
    | 'IGNORED'
    | 'DEAD_LETTERED';

  readonly orderingKey: string | null;
  readonly laneKey: string | null;
  readonly sequenceInLane: number | null;

  readonly nextAttemptAt: string;
  readonly attemptCount: number;
  readonly maxAttempts: number;

  readonly claimOwner: string | null;
  readonly claimedUntil: string | null;

  readonly createdAt: string;
  readonly updatedAt: string;
}
```

## 4. Subscriber result model

```ts
export type DeliveryResult =
  | { kind: 'DELIVERED'; receipt?: string }
  | { kind: 'IGNORED'; reasonCode: string; detail?: string }
  | { kind: 'RETRYABLE_FAILURE'; reasonCode: string; detail?: string }
  | { kind: 'TERMINAL_FAILURE'; reasonCode: string; detail?: string };
```

### Normative rules

1. Subscribers **MUST** return `DeliveryResult` for all expected operational
   outcomes.
2. Subscribers **MUST NOT** use exceptions to represent retryable or terminal
   business/infrastructure outcomes.
3. The worker **MUST** normalize any thrown exception to
   `TERMINAL_FAILURE` with reason code `SUBSCRIBER_UNEXPECTED_THROW`, unless a
   future policy explicitly downgrades it.

## 5. Subscriber contract

```ts
export interface DeliverOutboxEventInput<TPayload = unknown> {
  readonly messageId: OutboxMessageId;
  readonly tenantId: TenantId;
  readonly topic: OutboxTopic;
  readonly eventType: string;
  readonly payload: TPayload;
  readonly headers: OutboxHeaders;
  readonly orderingKey: string | null;
  readonly laneKey: string | null;
  readonly sequenceInLane: number | null;
  readonly attemptNumber: number;
  readonly firstSeenAt: string;
}

export interface IOutboxSubscriber<TPayload = unknown> {
  readonly subscriberKey: string;
  readonly acceptedTopics: readonly OutboxTopic[];
  readonly maxConcurrency: number;

  deliver(input: DeliverOutboxEventInput<TPayload>): Promise<DeliveryResult>;
}
```

### Normative rules

1. `maxConcurrency` applies per subscriber instance inside one worker process.
2. If ordering is required for a topic, the effective concurrency inside one
   lane is `1`, even if `maxConcurrency > 1` across lanes.
3. Subscribers **MUST** be idempotent by `headers.idempotencyKey`.

## 6. Subscriber registry

```ts
export interface IOutboxSubscriberRegistry {
  getSubscriber(topic: OutboxTopic): IOutboxSubscriber;
  listSubscribers(): readonly IOutboxSubscriber[];
}
```

### Normative rules

1. Exactly one subscriber is registered per topic in the polling worker family.
2. If no subscriber is registered, the worker **MUST** dead-letter the record
   with reason `NO_SUBSCRIBER_REGISTERED`.
3. If multiple subscribers are required, fan-out belongs to a separate
   publication layer, not to this worker contract.

## 7. Delivery policy contract

```ts
export interface RetryBackoffPolicy {
  readonly strategy: 'fixed' | 'exponential';
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly multiplier?: number;
  readonly jitter: 'none' | 'full';
}

export interface DeliveryPolicy {
  readonly maxAttempts: number;
  readonly retryableReasonCodes: readonly string[];
  readonly terminalReasonCodes: readonly string[];
  readonly backoff: RetryBackoffPolicy;
}
```

### Normative rules

1. Policy is resolved per topic.
2. Unknown reason codes default to terminal unless explicitly configured
   otherwise.
3. Policy resolution must be deterministic and side-effect free.

## 8. Polling store contract

```ts
export interface ClaimBatchRequest {
  readonly workerId: string;
  readonly nowIso: string;
  readonly batchSize: number;
  readonly allowedTopics: readonly OutboxTopic[];
  readonly claimLeaseMs: number;
}

export interface ClaimLanesRequest {
  readonly workerId: string;
  readonly nowIso: string;
  readonly laneLeaseMs: number;
  readonly laneBatchSize: number;
  readonly allowedTopics: readonly OutboxTopic[];
}

export interface DeliveryMutationAudit {
  readonly workerId: string;
  readonly decidedAt: string;
  readonly reasonCode?: string;
  readonly detail?: string;
  readonly receipt?: string;
}

export interface IOutboxStorePolling {
  claimUnorderedBatch(request: ClaimBatchRequest): Promise<readonly OutboxRecord[]>;
  claimLanes(request: ClaimLanesRequest): Promise<readonly string[]>;
  claimLaneBatch(request: ClaimBatchRequest & { readonly laneKeys: readonly string[] }): Promise<readonly OutboxRecord[]>;
  markDelivered(messageId: OutboxMessageId, audit: DeliveryMutationAudit): Promise<void>;
  markIgnored(messageId: OutboxMessageId, audit: DeliveryMutationAudit): Promise<void>;
  markRetryScheduled(
    messageId: OutboxMessageId,
    nextAttemptAtIso: string,
    audit: DeliveryMutationAudit,
  ): Promise<void>;
  markDeadLettered(messageId: OutboxMessageId, audit: DeliveryMutationAudit): Promise<void>;
  releaseExpiredLaneLeases(nowIso: string, workerId?: string): Promise<number>;
  getLagSnapshot(allowedTopics: readonly OutboxTopic[], nowIso: string): Promise<OutboxLagSnapshot>;
}
```

```ts
export interface OutboxLagSnapshot {
  readonly pendingCount: number;
  readonly retryScheduledCount: number;
  readonly claimedCount: number;
  readonly oldestPendingCreatedAt: string | null;
}
```

### Normative rules

1. The store contract is **polling-family specific**.
2. Claiming is a queue-control primitive; it is not presented as pure CQRS.
3. `claimUnorderedBatch` handles rows with `laneKey IS NULL`.
4. `claimLanes` plus `claimLaneBatch` handle rows with `laneKey IS NOT NULL`.
5. Claim methods **MUST** be transactionally safe against concurrent workers.

## 9. Wake-up contract

```ts
export interface WaitForWorkInput {
  readonly idleDelayMs: number;
  readonly signal: AbortSignal;
}

export interface IOutboxWakeupSource {
  waitForWork(input: WaitForWorkInput): Promise<'notification' | 'timeout' | 'aborted'>;
}
```

### Normative rules

1. Wake-up is an optimization only.
2. The worker **MUST** continue to function correctly if notifications are lost.
3. A simple timeout-only implementation is valid.

## 10. Normalization boundary

```ts
export interface ISubscriberInvoker {
  invoke(
    subscriber: IOutboxSubscriber,
    input: DeliverOutboxEventInput,
  ): Promise<DeliveryResult>;
}
```

Reference behavior:

```ts
export class SubscriberInvoker implements ISubscriberInvoker {
  async invoke(
    subscriber: IOutboxSubscriber,
    input: DeliverOutboxEventInput,
  ): Promise<DeliveryResult> {
    try {
      return await subscriber.deliver(input);
    } catch (error) {
      return {
        kind: 'TERMINAL_FAILURE',
        reasonCode: 'SUBSCRIBER_UNEXPECTED_THROW',
        detail: error instanceof Error ? error.message : 'unknown throw',
      };
    }
  }
}
```

## 11. Outcome decision contract

```ts
export type DeliveryStoreCommand =
  | { kind: 'MARK_DELIVERED'; messageId: OutboxMessageId; receipt?: string }
  | { kind: 'MARK_IGNORED'; messageId: OutboxMessageId; reasonCode: string; detail?: string }
  | { kind: 'MARK_RETRY_SCHEDULED'; messageId: OutboxMessageId; nextAttemptAtIso: string; reasonCode: string; detail?: string }
  | { kind: 'MARK_DEAD_LETTERED'; messageId: OutboxMessageId; reasonCode: string; detail?: string };

export interface IDeliveryOutcomeDecider {
  decide(
    record: OutboxRecord,
    result: DeliveryResult,
    policy: DeliveryPolicy,
    nowIso: string,
  ): DeliveryStoreCommand;
}
```

### Normative rules

1. `RETRYABLE_FAILURE` with remaining budget becomes `MARK_RETRY_SCHEDULED`.
2. `RETRYABLE_FAILURE` without remaining budget becomes `MARK_DEAD_LETTERED`.
3. `TERMINAL_FAILURE` always becomes `MARK_DEAD_LETTERED`.
4. `DELIVERED` and `IGNORED` are terminal from the worker point of view.

## 12. Explicit exclusions

This specification does not define:

- CDC relay contracts,
- external event-bus publication protocol,
- exactly-once semantics,
- multi-subscriber fan-out.
