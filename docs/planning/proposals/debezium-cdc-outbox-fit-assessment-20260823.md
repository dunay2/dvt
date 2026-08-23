---
title: Debezium fit assessment for DVT outbox delivery and PostgreSQL CDC sources
status: proposed-evidence-gate
owner: Architecture / Data / Delivery
created: 2026-08-23
baseline: main@ffee4ee479b683e3346d5a96749229f798d4ca41
epic: https://github.com/dunay2/dvt/issues/2612
---

# Debezium fit assessment for DVT outbox delivery and PostgreSQL CDC sources

## 1. Executive decision

Debezium has a credible fit in DVT, but there are **two independent decisions**:

1. **Internal delivery:** use Debezium PostgreSQL CDC plus Outbox Event Router to publish DVT transactional-outbox events to Redpanda instead of the custom polling publisher.
2. **Product acquisition:** expose PostgreSQL CDC as a future DVT source mode.

They must not be bundled into one implementation.

### Current recommendation

| Use case | Recommendation | Reason |
|---|---|---|
| Replace/reduce the custom outbox publisher | **GO for a bounded disposable PoC; NO-GO for production cutover now** | It can close the missing Redpanda publisher and may remove bespoke polling machinery, but the current mutable outbox contract is incompatible with Debezium Event Router's insert-only queue contract and the worker hosts other responsibilities. |
| PostgreSQL CDC as a DVT source | **Strategic fit; defer implementation behind a product-contract gate** | DVT reserves stream vocabulary, but current Source Import is PostgreSQL-relation-only. A topic is not yet an admitted DVT source. |
| Add Debezium to the default MVP immediately | **Reject** | It would add Kafka Connect, replication-slot/WAL operations and another runtime before value and deletable scope are measured. |
| Keep old and new publishers indefinitely | **Reject** | It creates duplicate authority, extra failure modes and no simplification. |

The first executable decision is therefore:

> Compare the current worker with a disposable Debezium outbox path on the same event corpus and failure schedule. Adopt only if ordering, duplicate safety, recovery, WAL bounds, operability and real code deletion are demonstrated.

No product code is changed by this branch.

## 2. Scope and method

### Baseline

- Repository: `dunay2/dvt`
- Baseline: `main@ffee4ee479b683e3346d5a96749229f798d4ca41`
- Review date: `2026-08-23`
- Study branch: `docs/debezium-fit-assessment-20260823`

### Reviewed DVT authorities

- PostgreSQL/Kafka decisions: ADR-0002 and ADR-0003.
- Current delivery contracts and runtime: `@dvt/delivery`.
- PostgreSQL outbox persistence: `PostgresOutboxStore` and migrations.
- Standalone outbox host, event buses, ownership, health and metrics: `apps/outbox-worker`.
- Current Redpanda prototype assets.
- Source Import contracts, ADR-0058 and source-object stream vocabulary.
- Existing coordination issues #409 and #2173.

### Reviewed external authority

Only first-party documentation is used for tool behavior:

- Debezium PostgreSQL connector.
- Debezium Outbox Event Router SMT.
- Debezium monitoring guidance.
- Redpanda Kafka Connect/PostgreSQL Debezium connector guidance.
- PostgreSQL replication-slot and WAL-retention documentation.

### Limits

This is a source-backed feasibility assessment, not benchmark evidence. Latency, throughput, memory, WAL growth and monetary infrastructure cost have not yet been measured. Person-day values are planning ranges and must be replaced or narrowed by #2613–#2615.

## 3. DVT AS-IS

### 3.1 Authority and transaction boundary

Accepted architecture states:

```text
PostgreSQL = persisted authority
Kafka/Redpanda = distribution bus
```

DVT writes the canonical run event and transactional outbox record in PostgreSQL, avoiding a request-path database-plus-bus dual write. This principle remains valid with either the current worker or Debezium.

What should remain stable:

- PostgreSQL remains the canonical event authority.
- Event identity and `runSeq` remain domain contracts.
- Outbox creation remains in the same database transaction as accepted state.
- Downstream consumers remain idempotent because at-least-once redelivery is possible in either design.

Debezium would change **distribution progression**, not the canonical run-event authority.

### 3.2 Current outbox persistence is a mutable delivery queue

The base outbox contains:

```text
id
run_id
shard_id
run_seq
created_at
idempotency_key
payload
attempts
last_error
delivered_at
```

Later migrations add:

```text
claimed_at
next_attempt_at
outbox_dead_letter
pending/shard/run-order indexes
```

`PostgresOutboxStore` owns more than enqueue:

- tenant-affine shard assignment;
- transactional enqueue;
- claim lease and stale-claim recovery;
- `FOR UPDATE SKIP LOCKED` coordination;
- strict blocking of a later `runSeq` while an earlier event in the run remains pending;
- exponential retry scheduling;
- delivered marking;
- dead-letter movement;
- tenant-scoped dead-letter replay.

This is important because Debezium Outbox Event Router expects an outbox to behave as an **insert-only queue**. Its official contract treats UPDATE as invalid and filters DELETE. Therefore attaching the SMT directly to the current mutable table would produce warnings/errors or ignored changes and would not be an honest migration.

A Debezium cutover needs a new insert-only delivery contract or a deliberate hard schema migration; it is not an `IEventBus` implementation swap.

### 3.3 Current publication runtime

`OutboxWorker` performs a claim/process/deliver loop. Records are currently processed sequentially:

```text
for each record
  publish payload
  mark database row delivered
```

The publish and delivered-marker update are not atomic. If publication succeeds and the process dies before `markDelivered`, a later retry can republish the event. This is valid at-least-once behavior only when consumer idempotency is enforced.

The standalone host adds substantial operational behavior:

- polling/backoff and batch configuration;
- active/passive ownership and PostgreSQL advisory-lock fencing;
- shard selection;
- health, readiness and metrics HTTP surfaces;
- retry/backlog/oldest-age telemetry;
- HTTP or log event bus selection;
- shutdown and resource lifecycle;
- canary/integration evidence;
- delivery-buffer purge;
- run-event retention.

The last two responsibilities are not publication. They prevent deleting the complete worker process merely because Debezium publishes events.

### 3.4 The selected bus and the implemented bus are not aligned

The repository architecture and Redpanda prototype describe:

```text
PostgreSQL -> transactional outbox -> Kafka/Redpanda
```

But the current production event-bus factory exposes only:

```text
http
log
```

There is no Kafka/Redpanda publisher in `createOutboxEventBus` at this baseline. This creates a real decision point:

- implement a native Kafka `IEventBus` while retaining the custom queue; or
- externalize publication to Debezium/Kafka Connect and remove the custom delivery queue after proof.

Debezium is therefore not merely replacing a finished Kafka publisher. It may close a missing production capability—but at a higher operational cost than adding one library-backed Kafka adapter.

### 3.5 Current Redpanda integration is prototype-level

The reviewed `infra/docker/postgres/redpanda/docker-compose.yml` starts only:

- PostgreSQL 16;
- one Redpanda node.

It does not configure:

- PostgreSQL logical replication;
- Kafka Connect;
- Debezium connector plugins;
- connector config/offset/status topics;
- Schema Registry;
- connector metrics or alerting;
- replication-slot/WAL safeguards.

The Debezium path therefore adds a new runtime and operational contract; it does not activate an already deployed component.

### 3.6 Current source-import product is relation-only

ADR-0058 and the source-import contracts establish a provider-neutral catalog, but the active warehouse connection type is PostgreSQL and the delivered path imports relations.

The shared `SourceObject` vocabulary includes:

```text
relation
file
endpoint
stream
```

and stream protocol values such as `kafka`, `pulsar` and `other`. This is useful architectural headroom, but it is not evidence that API, persistence, Planner, execution, Web or authorization currently supports streaming.

#2173 remains the relevant owner for relation discovery, connection-bound identity and import hardening. A future CDC source must reuse that authority rather than adding a second credential, connection or source-identity subsystem.

### 3.7 Approximate current code footprint

Byte counts below are source-tree payload sizes from the reviewed Git trees, not LOC, complexity points or guaranteed deletion.

| Area | Reviewed footprint | Interpretation |
|---|---:|---|
| `apps/outbox-worker/src` | 25 TypeScript files, ~103.6 KB | Complete standalone host; includes publication plus purge/retention and operational concerns. Not wholly removable. |
| `apps/outbox-worker/test` | 30 files, ~213.4 KB | Host, canary, ordering, idempotency, metrics, ownership, runtime, purge and retention evidence. Some tests survive or must be replaced. |
| `@dvt/delivery/src` | 15 files, ~50.9 KB | Includes outbox delivery, projector runtime, admission and test helpers. |
| Direct outbox publication/runtime subset in `@dvt/delivery/src` | ~25.1 KB | Candidate simplification boundary, subject to exact symbol-level inventory. |
| Direct outbox tests in `@dvt/delivery/test` | ~33.7 KB | Candidate deletion/replacement only after equivalent connector evidence exists. |
| PostgreSQL outbox store/migrations/tests | additional, not included above | Contains enqueue plus mutable claim/retry/DLQ/replay; only part is removable because transactional enqueue remains. |

The gain hypothesis is meaningful but not proven: Debezium could remove a substantial custom delivery slice, but only after housekeeping, projector and retention responsibilities are separated and a hard cut deletes old state and tests.

## 4. Debezium capability assessment

### 4.1 PostgreSQL CDC connector

The connector uses PostgreSQL logical decoding to read committed WAL changes. Key capabilities relevant to DVT are:

- initial snapshot followed by continuous streaming;
- table/schema inclusion filtering;
- PostgreSQL `pgoutput` publication integration;
- restart from externally stored LSN offsets while the replication slot remains valid;
- change envelopes with source metadata, operation and before/after state as supported by key/replica identity;
- snapshot modes and ad hoc/incremental snapshot mechanisms;
- transaction and heartbeat metadata options;
- connector metrics through Kafka Connect/JMX.

Operational consequences:

- each connector requires an isolated slot; sharing a slot risks incomplete capture;
- publication ownership must be explicit;
- the connector needs replication privileges;
- a stalled slot can retain WAL and consume disk;
- losing the slot or required WAL can require rebuild/resnapshot/reconciliation;
- recovery can emit duplicates, so abnormal-failure semantics are at-least-once.

These are production responsibilities, not connector-config details.

### 4.2 Outbox Event Router

The Event Router SMT can transform a captured outbox INSERT into a business event with:

- unique event ID in a message header;
- configurable event key;
- topic routing from a selected field;
- JSON or arbitrary/binary payload propagation;
- additional fields in headers/envelope/partition;
- event timestamp mapping;
- optional partition selection.

The event key is especially important: Kafka preserves ordering within a partition, so DVT must key all events for one `tenantId + runId` consistently. A random event ID would distribute adjacent `runSeq` values and lose the current ordering contract.

The SMT explicitly expects INSERT-only outbox records. UPDATE is invalid and DELETE is filtered. This is the largest incompatibility with DVT's current queue.

### 4.3 Runtime choice

#### Kafka Connect — preferred PoC runtime

Pros:

- natural host for the Debezium PostgreSQL connector and Event Router SMT;
- directly targets Redpanda's Kafka protocol;
- standard connector config/status/offset model;
- supports predicates, converters and connector monitoring.

Cons:

- adds a JVM/Connect runtime and internal topics;
- needs plugin/version/config/secret ownership;
- adds connector lifecycle and metrics to operations;
- cluster availability does not guarantee connector health.

#### Debezium Server — alternative, not first choice for this PoC

Debezium Server can run a connector and send events to supported sinks, but using it as a second evaluated runtime would add work without answering the first Redpanda/Event Router question. Evaluate it only if Kafka Connect cannot satisfy a bounded requirement.

#### Embedded Engine — reject for the first evaluation

Embedding Debezium in DVT would bring connector lifecycle and Java runtime coupling back into the product, undermining the intended externalization and increasing custom ownership.

### 4.4 Monitoring requirements

A production candidate needs two truth planes:

#### Connector/Connect truth

- connector and task state;
- source-event position/LSN;
- queue size and remaining capacity;
- snapshot state/progress;
- event processing rate;
- errors/restarts;
- offset/config/status topic availability.

#### PostgreSQL truth

- slot exists and is active when expected;
- `restart_lsn` and `confirmed_flush_lsn`;
- retained WAL bytes and disk headroom;
- WAL availability/status;
- publication/table membership;
- `max_slot_wal_keep_size` and idle-slot policy;
- database replication capacity.

A green connector HTTP status without bounded WAL is not sufficient readiness.

## 5. Fit A — internal transactional-outbox publication

### 5.1 Candidate target

```text
DVT DB transaction
  |- append canonical run event
  `- INSERT immutable outbox event
          |
          v
PostgreSQL WAL + dedicated publication/slot
          |
          v
Debezium PostgreSQL connector
          |
          v
Outbox Event Router
          |
          v
Redpanda topic keyed by tenantId + runId
          |
          v
idempotent consumers
```

### 5.2 What is reusable

Retain:

- canonical `EventEnvelope` and versioning;
- run event identity, `tenantId`, `runId`, `runSeq` and idempotency key;
- same-transaction outbox INSERT;
- PostgreSQL as authority;
- downstream idempotency expectations;
- Redpanda as distribution bus;
- existing ordering/idempotency canary corpus where topology-independent.

### 5.3 What must change if adopted

- outbox becomes immutable/insert-only;
- Kafka key and topic routing become explicit persisted/event contracts;
- `claimed_at`, `attempts`, `next_attempt_at`, `delivered_at` and custom outbox DLQ stop being publication progression truth;
- connector offset + slot + topic become distribution progression evidence;
- current polling publisher, sharding/fencing and HTTP delivery surfaces become deletion candidates;
- malformed-event/DLQ/replay semantics must be redesigned around connector/topic/consumer behavior;
- purge and run-event retention must remain or move to a clearly owned runtime;
- health/readiness/metrics must be rewritten around Connect, slot, WAL and Redpanda lag.

### 5.4 Ordering mapping

Current DVT enforces earlier `runSeq` delivery before later events for the same run. Candidate rule:

```text
Kafka key = stable canonical hash/string of tenantId + runId
```

Requirements:

- same run always maps to one partition;
- all producers use the same key derivation/version;
- topic partition count changes do not create ungoverned cross-partition ordering assumptions for an active run;
- consumers validate `runSeq` and detect gaps/conflicts;
- ordering never depends on wall-clock timestamps.

Debezium transaction order alone is not a substitute for the consumer-visible per-run key contract.

### 5.5 Duplicate mapping

Debezium may re-emit after faults. Candidate rule:

```text
unique event ID/idempotency key -> message header and/or governed envelope
```

Consumer behavior:

- same ID + same content: idempotent duplicate;
- same ID + different content: hard conflict;
- duplicates counted and observable;
- no second canonical event/projection/side effect.

This is equivalent in principle to the current publish-then-mark-delivered crash window; Debezium does not remove the need for idempotency.

### 5.6 Main gains

- closes the current direct Redpanda publication gap;
- removes database polling and publish/mark-delivered round trips from application code;
- delegates WAL progression, offsets and connector recovery to mature infrastructure;
- may delete custom claim leases, retry scheduler, shard ownership/fencing and HTTP publisher;
- provides a reusable operational CDC foundation for later bounded use cases.

### 5.7 Main costs and risks

- schema migration from mutable queue to immutable events;
- Kafka Connect/Debezium runtime, security, upgrades and internal topics;
- unique publication/slot lifecycle;
- source-database WAL/disk risk during connector outage;
- duplicate, ordering, malformed-event and schema-evolution contracts still owned by DVT;
- old DLQ/replay UX does not map one-to-one;
- worker process remains until purge/retention ownership is resolved;
- current #409 investment can be stranded if migration is started before evidence/closeout;
- native Kafka adapter might close the immediate bus gap more cheaply.

## 6. Fit B — PostgreSQL CDC as a DVT source

### 6.1 Strategic fit

Debezium is technically well suited to acquiring committed PostgreSQL changes without:

- full-table rescans;
- mandatory `updated_at` conventions;
- application-managed high-watermark SQL;
- trigger-maintained shadow tables.

It could support a future source path such as:

```text
PostgreSQL table
  -> snapshot + WAL changes
  -> Redpanda governed topic
  -> DVT stream source
  -> bounded offset/window
  -> preview, profiling, validation or materialization
```

### 6.2 Why it is not a small connector task

A real DVT vertical must define:

- source identity beyond topic name;
- connection/credential and replication-role ownership;
- connector/publication/slot/topic lifecycle;
- initial snapshot and snapshot-to-stream transition;
- insert/update/delete and before/after semantics;
- event time, database commit time and processing time;
- primary-key/replica-identity behavior;
- duplicates, gaps, replay and resnapshot;
- serialization/schema evolution;
- authorization and tenant isolation;
- preview limits and sensitive-data policy;
- finite micro-batch versus continuous execution;
- Planner/run/materialization integration;
- operational status and teardown.

Current finite plan/run semantics must not be stretched into a continuous runtime accidentally. The first vertical should be one bounded outcome, likely a finite offset/window preview or micro-batch, rather than a generic streaming platform.

### 6.3 Initial product recommendation

Do not implement a generic `DebeziumSource` class now.

First choose one user outcome. A reasonable first candidate is:

> Admit an externally or DVT-managed PostgreSQL CDC stream and preview/profile one bounded offset window with stable source identity and no continuous transformation runtime.

Even that is deferred until #2173 source authority is stable and #2617 accepts a product contract.

## 7. Alternatives

| Option | Engineering cost | Operational cost | Gain | Primary limitation | Initial decision |
|---|---:|---|---|---|---|
| O0 — keep HTTP/log worker as-is | 0 immediate | current custom worker | no new direct Redpanda capability | architecture/runtime gap remains | valid only if HTTP sink is product decision |
| O1 — add native Kafka/Redpanda `IEventBus` | provisional 5–9 person-days | low/medium; current worker remains | closes bus gap with minimal topology change | retains polling, claims, retries, fencing and mutable outbox | must be baseline alternative in #2613/#2616 |
| O2 — Debezium outbox evaluation | 8–14 person-days | medium/high; Connect + slot/WAL | proves compatibility and possible simplification | no production value until hard cut | **recommended next evidence** |
| O2 production cutover if accepted | additional 15–28 person-days | medium/high | potentially removes substantial custom delivery code | schema, ownership and live migration risk | gated by #2615/#2616 |
| O3 — PostgreSQL CDC source feasibility contract | 3–6 person-days | none/minimal during study | identifies a bounded product vertical | no source capability delivered | recommended after relation authority refresh |
| O3 minimal real CDC source vertical | 25–45 person-days | high; connector/source lifecycle | meaningful incremental/near-real-time product capability | API/Web/security/execution/ops scope | deferred pending #2617 |

All figures assume one experienced backend/data engineer, existing local PostgreSQL/Redpanda, one provider and no production HA. Cloud monetary cost is intentionally not fabricated before a target deployment and measurements exist.

## 8. Evaluation cost breakdown

| Work | Issue | Estimate | Output |
|---|---|---:|---|
| Freeze AS-IS, baseline and acceptance gates | #2613 | 1.5–2.5 pd | reproducible current baseline and exact disposition inventory |
| Build isolated Event Router PoC | #2614 | 2–4 pd | pinned disposable PostgreSQL → Connect/Debezium → Redpanda path |
| Failure, ordering, duplicate, WAL and performance proof | #2615 | 3–5 pd | current-vs-candidate evidence and operational cost |
| Retain/adopt/defer/reject decision and migration design | #2616 | 1.5–2.5 pd | one approved publisher path and delete-first plan |
| **Outbox evaluation total** |  | **8–14 pd** | excludes optional CDC-source contract |
| CDC-source product contract gate | #2617 | 3–6 pd | independent product decision |
| **Combined study programme** |  | **11–20 pd** | includes both independent decisions without assuming overlap |

The ranges are planning estimates. #2613 must freeze workload and evidence methods before later tasks narrow them.

## 9. Expected gain accounting

### 9.1 Gain that can be claimed now

- architectural option identified;
- missing direct Redpanda publisher exposed;
- mutable-outbox/Event-Router incompatibility identified;
- current code ownership and non-removable worker concerns identified;
- measurable decision gates and work breakdown created.

### 9.2 Gain that remains hypothetical until PoC

- lower commit-to-topic latency;
- higher throughput;
- lower PostgreSQL/application round trips;
- lower maintenance cost;
- exact source/test deletion;
- acceptable Connect memory/CPU floor;
- bounded WAL behavior;
- easier replay and failure recovery;
- reusable foundation for product CDC sources.

No one should cite those as delivered benefit before #2615.

### 9.3 Minimum adoption gain

Adoption should require all of:

1. zero lost accepted events in governed tests;
2. all duplicates detected and semantically idempotent;
3. per-run `runSeq` ordering preserved;
4. connector/Redpanda/PostgreSQL failures recover according to a tested runbook;
5. WAL retention bounded and alerted;
6. p95 latency and sustained throughput meet frozen targets;
7. operational owner accepts Connect/slot/WAL responsibilities;
8. exact custom code/tests/schema are deleted or moved in the approved migration;
9. no permanent dual publisher;
10. measured gain exceeds the cheaper native Kafka-adapter alternative.

## 10. Stop conditions

Reject or defer the outbox migration when any remains true:

- current event semantics cannot fit an insert-only table without a second canonical envelope;
- stable key/partition mapping cannot preserve per-run order;
- duplicates cannot be absorbed through existing identity;
- connector outage can grow WAL without an enforceable bound and alert;
- malformed rows can block progress without safe detection/recovery;
- the operational cost is greater than the custom code actually removable;
- purge/retention becomes duplicated or ownerless;
- the migration needs indefinite dual writing/publishing;
- measured benefit does not exceed O1 native Kafka publication.

Reject or defer the product CDC source when:

- no named user-visible outcome exists;
- topic name substitutes for governed source identity;
- no owner accepts source-database WAL risk;
- current finite execution model cannot safely express the vertical;
- the first slice requires a generic connector registry/streaming framework;
- authorization, credential and tenant boundaries cannot be reused from current source authority;
- API/Web/lifecycle cost dominates any measured incremental-compute or latency benefit.

## 11. Recommended sequence

```text
#2613  freeze AS-IS and metrics
   |
   v
#2614  isolated insert-only Debezium PoC
   |
   v
#2615  adversarial correctness/WAL/performance proof
   |
   v
#2616  explicit retain | adopt | defer | reject

#2617  independent CDC-source product gate
        coordinated with #2173, not implied by outbox success
```

Do not begin a production implementation before #2616 records an approved decision.

## 12. Created work

| Issue | Purpose |
|---|---|
| [#2612](https://github.com/dunay2/dvt/issues/2612) | Epic and shared decision gates |
| [#2613](https://github.com/dunay2/dvt/issues/2613) | AS-IS source inventory, baseline, cost and thresholds |
| [#2614](https://github.com/dunay2/dvt/issues/2614) | Disposable Event Router PoC on Redpanda |
| [#2615](https://github.com/dunay2/dvt/issues/2615) | Ordering, idempotency, recovery, WAL and operating-cost proof |
| [#2616](https://github.com/dunay2/dvt/issues/2616) | One-path decision and delete-first migration design |
| [#2617](https://github.com/dunay2/dvt/issues/2617) | Independent PostgreSQL CDC source product gate |

## 13. Repository references

Pinned to the reviewed baseline unless noted:

- [ADR-0002 — PostgreSQL authority, Kafka distribution](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/infra/docker/postgres/redpanda/docs/adr/ADR-0002-postgres-authority-kafka-bus.md)
- [ADR-0003 — Transactional outbox](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/infra/docker/postgres/redpanda/docs/adr/ADR-0003-transactional-outbox.md)
- [Outbox delivery architecture](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/docs/architecture/diagrams/outbox-delivery-architecture.md)
- [`OutboxWorker`](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/delivery/src/application/OutboxWorker.ts)
- [`@dvt/delivery` contracts](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/delivery/src/contracts.ts)
- [`PostgresOutboxStore`](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/adapter-postgres/src/PostgresOutboxStore.ts)
- [Initial outbox migration](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/adapter-postgres/migrations/001_init.sql)
- [Shard/retry/ordering migration](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/adapter-postgres/migrations/003_outbox_shard_retry_and_ordering.sql)
- [Standalone outbox-worker README](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/apps/outbox-worker/README.md)
- [Event-bus factory](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/apps/outbox-worker/src/runtime/createOutboxEventBus.ts)
- [HTTP event bus](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/apps/outbox-worker/src/bus/HttpEventBus.ts)
- [Outbox-worker environment contract](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/apps/outbox-worker/src/plugins/env.ts)
- [Redpanda prototype compose](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/infra/docker/postgres/redpanda/docker-compose.yml)
- [ADR-0058 — Warehouse Source Import rails](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/docs/adr/ADR-0058-warehouse-source-import-rails.md)
- [Source Import operations contract](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts)
- [Source-object catalog and stream locator](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts)
- [#409 — standalone outbox-worker hardening](https://github.com/dunay2/dvt/issues/409)
- [#2173 — warehouse connection/source import convergence](https://github.com/dunay2/dvt/issues/2173)

## 14. External primary references

- [Debezium PostgreSQL connector](https://debezium.io/documentation/reference/stable/connectors/postgresql.html)
- [Debezium Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)
- [Debezium monitoring](https://debezium.io/documentation/reference/stable/operations/monitoring.html)
- [Debezium Server](https://debezium.io/documentation/reference/stable/operations/debezium-server.html)
- [Redpanda Kafka Connect and managed connectors](https://docs.redpanda.com/current/deploy/deployment-option/self-hosted/kubernetes/k-deploy-connectors/)
- [Redpanda PostgreSQL Debezium source connector](https://docs.redpanda.com/current/develop/managed-connectors/create-postgresql-connector/)
- [PostgreSQL replication configuration and WAL slot limits](https://www.postgresql.org/docs/current/runtime-config-replication.html)
- [`pg_replication_slots`](https://www.postgresql.org/docs/current/view-pg-replication-slots.html)

## 15. Final position

Debezium is **not an automatic simplification**. It exchanges application code for infrastructure and source-database operational risk.

It becomes a good DVT decision only when the exchange is explicit:

```text
remove enough custom delivery code and state
+ close the real Redpanda gap
+ preserve ordering and idempotency
+ bound WAL and connector operations
> cost of adding and owning Kafka Connect/Debezium
```

The repository currently justifies the PoC, not the migration. The CDC-source opportunity is strategically stronger but is a separate product vertical and should remain deferred until its user outcome and execution contract are bounded.
