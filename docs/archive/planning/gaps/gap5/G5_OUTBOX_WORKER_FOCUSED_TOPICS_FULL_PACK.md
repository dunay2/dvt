

<!-- FILE: README.md -->

---
title: G5 Outbox Worker Focused Review Pack
status: Draft
owner: docs
last_reviewed: 2026-03-08
scope: focused-topics-only
---

# G5 Outbox Worker Focused Review Pack

This pack addresses **only** the topics raised in the latest review round:

1. polling / CDC coexistence is too restrictive,
2. secret handling and injection remains vague,
3. `DeliveryOutcomeDecider` still owns backoff computation,
4. crash-window testing is named but not concretely specified,
5. ordering lanes may be over-designed,
6. document fragmentation should be reduced,
7. naming should be unified,
8. operations guidance should exist.

This pack does **not** reopen unrelated areas such as worker migration, branded types,
or broad package decomposition. Those topics belong to other review threads.

## Outcomes fixed in this pack

- Replace the old rule **"exactly one production-active mechanism per (environment, topic)"**
  with a more precise rule based on **delivery channel** and **side effect ownership**.
- Clarify that the worker core does **not** resolve secrets. The host resolves secrets and
  injects already-materialized adapters/config into the runtime.
- Split backoff calculation out of `DeliveryOutcomeDecider` into `IBackoffCalculator`.
- Define a concrete crash-window test strategy with deterministic fault injection.
- Compare two lane designs and explicitly choose one for G5.x.
- Merge tiny documents into fewer, denser specs.
- Standardize the term **outbox record** across the pack.
- Add an operations document that covers monitoring, alerts, replay, and incident handling.

## Pack structure

- `G5_OUTBOX_WORKER_FOCUSED_TOPICS_FULL_REVIEW.md`
- `docs/adr/ADR-G5-002-focused-topics-addendum.md`
- `docs/specs/SPEC-G5-COEXISTENCE-SECRETS-AND-TYPES.md`
- `docs/specs/SPEC-G5-DELIVERY-OUTCOME-BACKOFF.md`
- `docs/architecture/ARCH-G5-ORDERING-LANES-AND-RUNTIME.md`
- `docs/quality/QUALITY-G5-CRASH-WINDOW-AND-TESTING.md`
- `docs/operations/OPS-G5-OUTBOX-WORKER.md`

## Source references used

- PostgreSQL `SELECT ... FOR UPDATE ... SKIP LOCKED`
- PostgreSQL `LISTEN/NOTIFY`
- Debezium Outbox Event Router
- `p-limit`
- OpenTelemetry JS
- Prometheus client library guidance


<!-- FILE: G5_OUTBOX_WORKER_FOCUSED_TOPICS_FULL_REVIEW.md -->

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


<!-- FILE: docs/adr/ADR-G5-002-focused-topics-addendum.md -->

---
title: ADR-G5-002 Focused Topics Addendum
status: Proposed
owners: Core Architecture
date: 2026-03-08
---

# ADR-G5-002 — Focused Topics Addendum

## Context

The previous G5 documents left unresolved questions in a narrow but important set of areas:

- coexistence of polling and CDC,
- secret handling boundary,
- backoff responsibility placement,
- crash-window testing,
- ordered lane design,
- operations readiness.

This ADR decides only those topics.

## Decision

### D1. Coexistence policy

Polling and CDC may coexist for the same domain topic **only when they do not own the same side effect**.

Normative rule:

> For a given `(environment, topic, delivery_channel, side_effect_class)` tuple, there must be exactly one production-active owner.

### D2. Secrets boundary

The worker core does not fetch or rotate secrets.

Secrets are resolved by the host process, which constructs authenticated adapters and injects ready-to-use dependencies into the runtime.

### D3. Backoff separation

`DeliveryOutcomeDecider` must not own retry timestamp calculation.
`IBackoffCalculator` is required whenever retry scheduling is enabled.

### D4. Ordered lanes

G5.x supports two execution modes:

- unordered mode,
- ordered mode with a dedicated lane lease table.

Ordered mode guarantees serial processing per lane only.

### D5. Crash-window quality gate

The delivery stack must expose a deterministic fault injection point after subscriber success and before store acknowledgment write.

### D6. Naming

The canonical term is **outbox record**.

## Consequences

- Hybrid topologies become possible without duplicating side effects.
- The worker core stays simpler and more testable.
- Retry policy becomes easier to test in isolation.
- Ordered delivery is explicit and observable, at the cost of an extra table.
- Crash-window behavior becomes testable rather than theoretical.

## Non-decisions

This ADR does not decide:

- worker migration strategy,
- branded type policy across the whole repository,
- whether CDC should become default in a future generation.

Those topics belong to separate decisions.


<!-- FILE: docs/specs/SPEC-G5-COEXISTENCE-SECRETS-AND-TYPES.md -->

---
title: Spec — G5 Coexistence, Secrets, and Naming
status: Draft
owner: docs
last_reviewed: 2026-03-08
---

# Spec — G5 Coexistence, Secrets, and Naming

## 1. Purpose

This specification defines:

- coexistence rules for polling and CDC,
- the secret/config boundary,
- naming rules for G5 documents and code.

---

## 2. Coexistence model

### 2.1 Runtime families

G5 recognizes two runtime families:

- **polling worker runtime**
- **CDC relay/runtime**

These are different runtime families and do not need a shared execution core.

### 2.2 Delivery dimensions

A delivery configuration is identified by:

- `environment`
- `topic`
- `deliveryChannel`
- `sideEffectClass`

```ts
export type DeliveryChannel =
  | 'internal_projection'
  | 'external_publication'
  | 'internal_callback'
  | 'integration_webhook';

export type SideEffectClass =
  | 'state_projection'
  | 'event_bus_publish'
  | 'webhook_delivery'
  | 'materialized_cache_update';
```

### 2.3 Ownership rule

Exactly one production-active owner may exist for the same
`(environment, topic, deliveryChannel, sideEffectClass)` tuple.

### 2.4 Allowed coexistence examples

#### Allowed

| Topic | Mechanism | Delivery channel | Side effect |
|---|---|---|---|
| workflow.run.events | polling | internal_projection | state_projection |
| workflow.run.events | CDC | external_publication | event_bus_publish |

#### Not allowed

| Topic | Mechanism | Delivery channel | Side effect |
|---|---|---|---|
| workflow.run.events | polling | external_publication | event_bus_publish |
| workflow.run.events | CDC | external_publication | event_bus_publish |

### 2.5 Shadow mode

A mechanism may run in shadow mode when:

- it does not own the side effect,
- it emits only logs, metrics, or comparisons,
- it cannot mutate the target system of record.

---

## 3. Secret boundary

### 3.1 Principle

Secrets are resolved outside the worker core.

### 3.2 Host responsibilities

The host must:

- resolve secrets from the selected source,
- instantiate authenticated adapters,
- sanitize all configuration before logging,
- pass only runtime-safe configuration into the worker.

### 3.3 Worker responsibilities

The worker must:

- accept only ready-to-use ports/adapters,
- avoid logging credentials or secret-bearing strings,
- treat secret retrieval as out of scope.

### 3.4 Dependency shape

```ts
export interface OutboxWorkerHostConfig {
  readonly pollIntervalMs: number;
  readonly maxBatchSize: number;
  readonly orderedModeEnabled: boolean;
}

export interface OutboxWorkerHostDependencies {
  readonly store: IOutboxStore;
  readonly subscriberRegistry: IOutboxSubscriberRegistry;
  readonly telemetry: IOutboxTelemetry;
  readonly logger: ILogger;
  readonly clock: IClock;
}
```

No `SecretProvider` is required in the core package for G5.x.

### 3.5 Redaction rules

The host must redact:

- passwords,
- tokens,
- DSNs with inline credentials,
- private keys,
- secret manager payloads.

Allowed in logs:

- database hostnames without credentials,
- logical secret identifiers,
- adapter names,
- deployment environment.

---

## 4. Naming rules

### 4.1 Canonical vocabulary

Use these names consistently:

- outbox record
- claimed outbox record
- outbox record id
- delivery attempt
- lane lease
- delivery policy
- retry schedule

### 4.2 Forbidden synonyms in this area

Avoid:

- outbox message
- queue item
- event row
- message row

### 4.3 Rationale

This package is about delivery of persisted outbox records.
Using one vocabulary reduces design drift and review noise.


<!-- FILE: docs/specs/SPEC-G5-DELIVERY-OUTCOME-BACKOFF.md -->

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


<!-- FILE: docs/architecture/ARCH-G5-ORDERING-LANES-AND-RUNTIME.md -->

---
title: Architecture — G5 Ordering Lanes and Runtime
status: Draft
owner: docs
last_reviewed: 2026-03-08
---

# Architecture — G5 Ordering Lanes and Runtime

## 1. Purpose

This document specifies:

- the runtime flow relevant to the focused review,
- ordered lane design,
- `LISTEN/NOTIFY` integration,
- why the dedicated lane lease table is retained.

---

## 2. Runtime flow

### 2.1 Main loop

The runtime owns the loop.

```ts
export interface IOutboxWorkerRuntime {
  run(signal: AbortSignal): Promise<void>;
  tickOnce(signal: AbortSignal): Promise<BatchProcessingReport>;
}
```

### 2.2 Flow

1. wait until next wake condition:
   - poll interval elapsed, or
   - `LISTEN/NOTIFY` wake signal arrives,
2. claim batch of unordered records, and/or claim lane leases + lane records if ordered mode is enabled,
3. process claimed records with bounded concurrency,
4. persist results,
5. update metrics,
6. sleep or wait for next wake signal.

### 2.3 `LISTEN/NOTIFY`

`LISTEN/NOTIFY` is a latency optimization only.
It never replaces polling as the safety net.

The runtime must behave correctly if notifications are delayed, dropped, or never received.

---

## 3. Bounded concurrency

The implementation should use a standard library such as `p-limit` instead of a custom queue worker helper.

```ts
import pLimit from 'p-limit';

const limit = pLimit(maxConcurrency);
const tasks = records.map((record) => limit(() => coordinator.execute(record)));
await Promise.allSettled(tasks);
```

---

## 4. Ordered lanes

## 4.1 Two execution modes

### Unordered mode

Default mode.
No lane lease table is used.
Records are claimed directly from the outbox table.

### Ordered mode

Enabled only for topics/subscribers that require serial processing by `orderingKey`.

A dedicated lane lease table is used.

---

## 5. Schema sketch

```sql
create table outbox_record (
  outbox_record_id uuid primary key,
  topic text not null,
  delivery_channel text not null,
  side_effect_class text not null,
  ordering_key text null,
  payload jsonb not null,
  attempt_count integer not null default 0,
  available_at timestamptz not null,
  lease_owner text null,
  lease_expires_at timestamptz null,
  status text not null
);

create table outbox_lane_lease (
  lane_key text primary key,
  topic text not null,
  lease_owner text null,
  lease_expires_at timestamptz null,
  updated_at timestamptz not null
);
```

---

## 6. Claim strategy

### 6.1 Unordered claim

```sql
select outbox_record_id
from outbox_record
where status = 'pending'
  and available_at <= now()
  and (lease_expires_at is null or lease_expires_at <= now())
order by available_at asc, outbox_record_id asc
for update skip locked
limit $1;
```

Then update the claimed rows with `lease_owner` and `lease_expires_at`.

### 6.2 Ordered lane claim

Step 1: claim lanes

```sql
select lane_key
from outbox_lane_lease
where topic = $1
  and (lease_expires_at is null or lease_expires_at <= now())
order by lane_key asc
for update skip locked
limit $2;
```

Step 2: update claimed lanes with owner + expiry.

Step 3: claim records only for owned lanes.

```sql
select outbox_record_id
from outbox_record
where topic = $1
  and ordering_key = any($2)
  and status = 'pending'
  and available_at <= now()
  and (lease_expires_at is null or lease_expires_at <= now())
order by ordering_key asc, available_at asc, outbox_record_id asc
for update skip locked
limit $3;
```

---

## 7. Why keep the lane lease table

The dedicated lane lease table remains justified for ordered mode because it gives:

- explicit owner visibility per lane,
- clean lease expiry semantics,
- better hot-lane debugging,
- simpler operational metrics,
- less repeated scanning for distinct ordering keys.

Without it, ordered mode is cheaper to start but harder to operate.

---

## 8. Important limits

- The system guarantees **serial processing per lane**, not global order.
- Two different lanes may be processed concurrently.
- If the same topic uses unordered and ordered subscribers, that must be modeled as distinct delivery configurations.

---

## 9. Class collaboration

```ts
export interface IOutboxWorkerEngine {
  processBatch(signal: AbortSignal): Promise<BatchProcessingReport>;
}

export interface IOrderedLaneClaimer {
  claimAvailableLanes(input: {
    readonly topic: string;
    readonly ownerId: string;
    readonly maxLanes: number;
    readonly leaseDurationMs: number;
  }): Promise<readonly string[]>;
}

export interface IOutboxRecordClaimer {
  claimUnorderedBatch(input: ClaimUnorderedBatchInput): Promise<readonly ClaimedOutboxRecord[]>;
  claimOrderedBatch(input: ClaimOrderedBatchInput): Promise<readonly ClaimedOutboxRecord[]>;
}
```

The engine orchestrates claimers and the delivery coordinator.


<!-- FILE: docs/quality/QUALITY-G5-CRASH-WINDOW-AND-TESTING.md -->

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


<!-- FILE: docs/operations/OPS-G5-OUTBOX-WORKER.md -->

---
title: Operations — G5 Outbox Worker
status: Draft
owner: ops
last_reviewed: 2026-03-08
---

# Operations — G5 Outbox Worker

## 1. Purpose

This runbook covers the focused operational topics for the G5 worker:

- how to monitor it,
- which alerts matter,
- what to do when delivery fails,
- how to replay dead-letter records safely.

---

## 2. Health model

### Liveness

The process is alive and the event loop is still progressing.

Suggested signal:

- last successful loop completion timestamp within threshold.

### Readiness

The worker is ready to process:

- store connectivity OK,
- subscriber registry initialized,
- telemetry sink initialized,
- ordered lane table reachable when ordered mode is enabled.

---

## 3. Core metrics

### Throughput

- `outbox_records_claimed_total`
- `outbox_records_delivered_total`
- `outbox_records_ignored_total`
- `outbox_records_retried_total`
- `outbox_records_dead_lettered_total`

### Lag

- `outbox_oldest_pending_record_age_seconds`
- `outbox_pending_records_count`

### Failures

- `outbox_subscriber_unexpected_throw_total`
- `outbox_store_write_failure_total`
- `outbox_retry_schedule_total`

### Ordered lane metrics

- `outbox_lane_leases_owned`
- `outbox_lane_lease_expired_total`
- `outbox_hot_lane_oldest_pending_age_seconds{lane_key=...}`

---

## 4. Suggested alerts

### Critical

- oldest pending record age above agreed SLO for sustained period,
- dead-letter growth spike,
- store write failures sustained,
- worker ready = false on all replicas.

### Warning

- retry rate above normal baseline,
- single lane remains hot for too long,
- lease expiry churn unusually high.

---

## 5. Replay from dead-letter queue

### Preconditions

- identify root cause,
- confirm subscriber fix or downstream fix exists,
- choose replay scope by topic, time range, or reason code,
- confirm side effects remain idempotent.

### Procedure

1. stop automatic replay job if one exists,
2. select dead-lettered outbox records for scope,
3. move records to `pending` or enqueue replay copies according to local policy,
4. reset lease fields,
5. set `available_at` to controlled replay time,
6. monitor replay rate and dead-letter recurrence.

### Never do this blindly

Do not replay a DLQ burst without validating subscriber idempotency and downstream capacity.

---

## 6. Incident examples

### Case A — records stuck pending

Check:

- database connectivity,
- poll loop timestamps,
- readiness state,
- `LISTEN/NOTIFY` is irrelevant if polling still works.

Action:

- confirm claim query health,
- inspect expired leases,
- inspect row lock contention,
- scale workers only if the store can support it.

### Case B — repeated retries with no progress

Check:

- reason codes,
- subscriber dependency outage,
- backoff policy too aggressive.

Action:

- pause replay pressure if needed,
- fix subscriber target,
- widen backoff temporarily if policy allows.

### Case C — hot lane starvation

Check:

- lane ownership metrics,
- queue depth for that lane,
- whether one lane dominates all work.

Action:

- accept serial behavior if business ordering requires it,
- investigate whether ordering granularity is too coarse,
- consider splitting the ordering key upstream if domain allows.

---

## 7. Observability stack guidance

Recommended baseline:

- traces via OpenTelemetry,
- metrics via Prometheus-compatible client,
- structured logs with redaction,
- dashboards showing pending age, retry rate, DLQ growth, and lane saturation.
