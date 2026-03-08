---
title: Spec — G5 Delivery Outcome and Backoff
status: Draft
owner: docs
last_reviewed: 2026-03-08
---

# Spec — G5 Delivery Outcome and Backoff

## 1. Purpose

This specification defines the narrow contract split between:

- subscriber invocation,
- delivery outcome decision,
- retry schedule calculation,
- store command emission.

---

## 2. Delivery result contract

```ts
export type DeliveryResult =
  | { readonly kind: 'DELIVERED'; readonly receipt?: string }
  | { readonly kind: 'IGNORED'; readonly reasonCode: string }
  | { readonly kind: 'RETRYABLE_FAILURE'; readonly reasonCode: string; readonly detail?: string }
  | { readonly kind: 'TERMINAL_FAILURE'; readonly reasonCode: string; readonly detail?: string };
```

Subscribers must return `DeliveryResult` for expected outcomes.
Thrown exceptions are treated as unexpected defects and normalized at the worker boundary.

---

## 3. Backoff contract

```ts
export interface DeliveryRetryPolicy {
  readonly maxAttempts: number;
  readonly strategy: 'fixed' | 'exponential';
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly jitter: 'none' | 'full';
}

export interface IBackoffCalculator {
  computeNextAttemptAt(input: {
    readonly firstAttemptAt: Date;
    readonly currentAttempt: number;
    readonly now: Date;
    readonly policy: DeliveryRetryPolicy;
  }): Date;
}
```

---

## 4. Outcome decision contract

```ts
export type DeliveryStoreCommand =
  | { readonly kind: 'MARK_DELIVERED'; readonly deliveredAt: Date; readonly receipt?: string }
  | { readonly kind: 'MARK_IGNORED'; readonly ignoredAt: Date; readonly reasonCode: string }
  | { readonly kind: 'MARK_TERMINAL_FAILURE'; readonly failedAt: Date; readonly reasonCode: string; readonly detail?: string }
  | { readonly kind: 'SCHEDULE_RETRY'; readonly nextAttemptAt: Date; readonly reasonCode: string; readonly detail?: string };

export interface IDeliveryOutcomeDecider {
  decide(input: {
    readonly result: DeliveryResult;
    readonly record: ClaimedOutboxRecord;
    readonly now: Date;
    readonly policy: DeliveryPolicy;
  }): DeliveryStoreCommand;
}
```

### 4.1 Rule

The decider may depend on `IBackoffCalculator`, but must not inline the backoff algorithm itself.

---

## 5. Reference collaboration

```ts
export interface ISubscriberInvoker {
  invoke(input: {
    readonly record: ClaimedOutboxRecord;
    readonly subscriber: IOutboxSubscriber;
  }): Promise<DeliveryResult>;
}

export interface IDeliveryOutcomeWriter {
  write(input: {
    readonly record: ClaimedOutboxRecord;
    readonly command: DeliveryStoreCommand;
  }): Promise<void>;
}
```

Recommended sequence:

1. resolve subscriber
2. invoke subscriber
3. decide store command
4. persist command outcome
5. emit telemetry

---

## 6. Why this split exists

Without `IBackoffCalculator`, `DeliveryOutcomeDecider` changes when:

- retry budget rules change,
- timing algorithm changes,
- jitter rules change.

That is unnecessary coupling.

---

## 7. Minimal pseudo-implementation

```ts
export final class DeliveryCoordinator {
  public constructor(
    private readonly resolver: ISubscriberResolver,
    private readonly invoker: ISubscriberInvoker,
    private readonly decider: IDeliveryOutcomeDecider,
    private readonly writer: IDeliveryOutcomeWriter,
    private readonly telemetry: IDeliveryTelemetry,
    private readonly clock: IClock,
  ) {}

  public async execute(record: ClaimedOutboxRecord): Promise<void> {
    const subscriber = this.resolver.resolve(record.topic);
    const result = await this.invoker.invoke({ record, subscriber });

    const command = this.decider.decide({
      result,
      record,
      now: this.clock.now(),
      policy: subscriber.deliveryPolicy,
    });

    await this.writer.write({ record, command });
    await this.telemetry.record(record, result, command);
  }
}
```
