---
title: G5 Outbox Worker Focused Topics Review
status: Draft
owner: docs
last_reviewed: 2026-03-08
scope: focused-topics-only
---

# G5 Outbox Worker Focused Topics Review

## 1. Scope

This document reviews **only** the latest set of open topics:

- coexistence of polling and CDC,
- secret handling,
- separation of backoff from delivery outcome decision,
- crash-window testing,
- lane design simplification,
- document consolidation,
- naming unification,
- operations guidance.

It does not re-open worker migration, branded type policy, or the broader package plan.

---

## 2. Executive decisions

### 2.1 Coexistence rule is relaxed, but not to the point of ambiguity

The previous rule:

> For a given `(environment, topic)` pair, exactly one production-active delivery mechanism may exist.

was too restrictive.

The corrected rule is:

> For a given `(environment, topic, delivery_channel, side_effect_class)` tuple, exactly one
> production-active owner may exist.

This permits controlled hybrids such as:

- **internal projection by polling**
- **external publication by CDC/Kafka**

for the same domain topic, provided they do **not** own the same side effect.

#### Example

Allowed:

- `topic = workflow.run.events`
- polling runtime delivers to `WorkflowSnapshotProjector`
- CDC relay publishes the same outbox records to Kafka for external analytics

Not allowed:

- polling runtime publishes to Kafka
- CDC relay also publishes the same records to Kafka
- result: duplicated side effect ownership

### 2.2 Secret handling is moved out of the worker core

The worker core must not know how secrets are fetched or rotated.

The split is:

- **host layer** resolves secrets from environment variables, secret manager, or workload identity,
- **adapter constructors** receive already-resolved credentials/config,
- **runtime/core** receives ready-to-use ports and configuration only.

This means the worker core is secret-agnostic. It handles config and adapters, not secret retrieval.

### 2.3 Backoff becomes its own policy service

`DeliveryOutcomeDecider` must no longer compute the next retry instant by itself.

The corrected split is:

- `DeliveryOutcomeDecider` decides **what command to issue**
- `IBackoffCalculator` computes **when the next retry should happen**

This removes a clear extra reason for change from the decider.

### 2.4 Crash-window testing becomes explicit

The quality plan must include a deterministic fault-injection path for the
critical window:

1. subscriber side effect succeeds,
2. process crashes before `markDelivered`.

This pack includes a concrete test approach based on injected crash hooks rather than vague references.

### 2.5 Lane design is simplified, but only after comparison

Two designs are analyzed:

1. **ephemeral locking over distinct ordering keys**
2. **dedicated lane lease table**

Decision for G5.x:

- keep the **lane lease table** as the primary design for ordered lanes,
- document exactly why it exists,
- keep a simplified no-lanes mode as the default when ordering is not required.

### 2.6 Document fragmentation is reduced

Tiny documents are merged.

In particular, type policy is folded into the coexistence/secrets/types spec instead
of standing alone.

### 2.7 Naming is unified

The standard term is:

- **outbox record**

Avoid:

- outbox message
- message row
- event row

Use:

- outbox record
- outbox record id
- outbox record lease
- outbox record attempt

### 2.8 Operations become first-class

The pack adds an operations document with:

- runtime health expectations,
- alerts,
- lag handling,
- replay from dead-letter queue,
- incident playbooks.

---

## 3. Focus topic 1 — Polling / CDC coexistence

### 3.1 Problem

The old rule effectively forced teams to choose one mechanism globally for a topic,
which blocks realistic hybrid patterns.

### 3.2 Correct architectural framing

Polling and CDC are not mutually exclusive at the **topic** level.
They are mutually exclusive only when they try to produce the **same side effect**.

Therefore the design must reason in terms of **delivery channels** and **side effect classes**.

#### Canonical delivery channels

- `internal_projection`
- `external_publication`
- `internal_callback`
- `integration_webhook`

#### Canonical side effect classes

- `state_projection`
- `event_bus_publish`
- `webhook_delivery`
- `materialized_cache_update`

### 3.3 Normative rule

For a given `(environment, topic, delivery_channel, side_effect_class)` tuple,
there must be exactly one production-active owner.

### 3.4 Shadow mode

Shadow mode remains valid:

- mechanism A owns the side effect,
- mechanism B runs in observe-only mode,
- mechanism B may log, compare, or emit metrics,
- mechanism B must not perform the owned side effect.

### 3.5 Implication

This change is a **policy clarification**, not a request to make polling and CDC share one runtime.

They remain two runtime families.

---

## 4. Focus topic 2 — Secret handling and injection

### 4.1 Problem

Statements such as "secrets may come from env vars or secret managers" are operationally true
but architecturally shallow.

### 4.2 Correct boundary

Secrets are resolved before worker runtime construction.

```ts
export interface OutboxWorkerHostDependencies {
  readonly store: IOutboxStore;
  readonly subscriberRegistry: IOutboxSubscriberRegistry;
  readonly telemetry: IOutboxTelemetry;
  readonly logger: ILogger;
  readonly clock: IClock;
}
```

No `SecretProvider` is required in the worker core unless the worker itself must
refresh credentials during runtime. G5.x does not require that.

### 4.3 Host responsibility

The host is responsible for:

- retrieving secrets,
- constructing authenticated adapters,
- redacting config before logging,
- handling credential rotation strategy at process boundary.

### 4.4 Worker responsibility

The worker is responsible for:

- using already-initialized ports,
- not logging secret-bearing config values,
- propagating sanitized metadata only.

### 4.5 Logging rule

No adapter or worker log line may contain:

- raw DSNs,
- tokens,
- passwords,
- connection strings with embedded credentials,
- secret manager payloads.

Only sanitized identifiers may be logged.

---

## 5. Focus topic 3 — `DeliveryOutcomeDecider` and backoff

### 5.1 Problem

If the decider computes retry schedule timing, it owns two reasons to change:

- outcome policy changes,
- backoff policy changes.

### 5.2 Correction

Introduce:

```ts
export interface IBackoffCalculator {
  computeNextAttemptAt(input: {
    readonly firstAttemptAt: Date;
    readonly currentAttempt: number;
    readonly now: Date;
    readonly policy: DeliveryRetryPolicy;
  }): Date;
}
```

### 5.3 New split

```ts
export interface IDeliveryOutcomeDecider {
  decide(input: {
    readonly result: DeliveryResult;
    readonly record: ClaimedOutboxRecord;
    readonly now: Date;
    readonly policy: DeliveryPolicy;
  }): DeliveryStoreCommand;
}
```

The decider may call the backoff calculator, but the calculation logic lives outside.

### 5.4 Concrete command outputs

Possible commands:

- `MARK_DELIVERED`
- `MARK_IGNORED`
- `MARK_TERMINAL_FAILURE`
- `SCHEDULE_RETRY`

The decider is not a store. It emits a command object.

---

## 6. Focus topic 4 — Crash-window tests

### 6.1 Problem

The pack previously named the test class but did not specify how to implement it.

### 6.2 Required fault injection point

The delivery pipeline must support a deterministic hook immediately after the subscriber
side effect returns success and immediately before the store write for `markDelivered`.

```ts
export interface ICrashWindowTestHook {
  afterSubscriberSuccessBeforeStoreWrite(input: {
    readonly outboxRecordId: string;
    readonly subscriberKey: string;
  }): Promise<void>;
}
```

Production implementation:

- no-op

Test implementation:

- throws a sentinel error or terminates the process fixture

### 6.3 Minimal deterministic test

1. insert one outbox record,
2. subscriber records the side effect in an idempotency-aware fake sink,
3. test hook throws after subscriber success,
4. verify outbox record is still pending or lease-expired,
5. rerun worker,
6. verify sink observed the same idempotency key twice at most,
7. verify logical side effect is applied once.

### 6.4 What the test proves

It proves the system is **at-least-once** and that correctness depends on subscriber idempotency.

It does **not** prove exactly-once.

---

## 7. Focus topic 5 — Ordering lanes

### 7.1 Problem

The review correctly questioned whether the lease table is over-engineered.

### 7.2 Design options

#### Option A — no dedicated lane table

Approach:

- select candidate ordering keys,
- lock associated outbox records directly,
- rely on `FOR UPDATE SKIP LOCKED`.

Pros:

- fewer tables,
- simpler schema,
- easier first implementation.

Cons:

- harder to reason about fair ownership of hot keys,
- harder to transfer lane ownership cleanly,
- more expensive repeated scans for distinct keys,
- weaker observability on lane health.

#### Option B — dedicated lane lease table

Approach:

- maintain one row per active lane,
- claim lease rows with `SKIP LOCKED`,
- then claim records for owned lanes.

Pros:

- explicit lease ownership,
- easier metrics and debugging,
- better support for hot-lane balancing,
- easier lease expiry semantics.

Cons:

- one extra table,
- slightly more operational complexity.

### 7.3 Decision

For G5.x:

- **unordered mode is the default**
- **ordered mode uses a dedicated lane lease table**

Reason:

The lease table costs little compared with the clarity it gives once ordered delivery matters.

### 7.4 Important limit

Ordered mode guarantees **serial processing per lane**, not global ordering across the topic.

---

## 8. Focus topic 6 — Document consolidation

The following consolidation applies:

- type policy is folded into the coexistence/secrets/types spec,
- naming policy is folded into the same spec,
- operations stays separate because it is for operators, not implementers.

This leaves a smaller, denser pack.

---

## 9. Focus topic 7 — Operations

The worker must be operable.

Minimum operational coverage:

- liveness and readiness endpoints,
- queue lag metrics,
- retry rate metrics,
- dead-letter growth alert,
- replay procedure from dead-letter queue,
- lease saturation visibility for ordered lanes,
- runbook for stuck leases,
- runbook for replay storms.

---

## 10. Final position

The focused corrections make the design more realistic.

Most importantly:

- coexistence is now defined by side effect ownership, not blunt topic exclusivity,
- secret handling is moved decisively into the host layer,
- backoff is separated from outcome policy,
- crash-window tests are implementable,
- lanes are justified instead of assumed,
- nomenclature is stable,
- operations are explicit.

This is now a document set a team can actually implement from.
