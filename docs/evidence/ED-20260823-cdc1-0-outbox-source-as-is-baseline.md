---
title: ED-20260823 - CDC1.0 DVT outbox and source AS-IS baseline
status: Final
date: 2026-08-23T00:00:00.000Z
owners: Architecture / Data / Delivery
evidence_class: critical
baseline: main@ffee4ee479b683e3346d5a96749229f798d4ca41
issue: https://github.com/dunay2/dvt/issues/2613
parent: https://github.com/dunay2/dvt/issues/2612
study_branch: docs/debezium-fit-assessment-20260823
---

# CDC1.0 DVT outbox and source AS-IS baseline

## 1. Result

`CDC1.0` is complete as an AS-IS and benchmark-contract study.

All source hypotheses in [#2613](https://github.com/dunay2/dvt/issues/2613) are confirmed at
`main@ffee4ee479b683e3346d5a96749229f798d4ca41`.

The important result is not that the current worker is unproven. Its functional and correctness
surface is substantial and has accepted local-Docker evidence. The result is narrower:

- DVT has a mature custom PostgreSQL polling outbox with at-least-once semantics, strict per-run
  ordering, retries, dead letter, sharding, fencing, readiness and metrics;
- the current production event-bus factory supports only `http` and `log`, not Kafka/Redpanda;
- the accepted live canary measured one event at `350 ms` from outbox `created_at` to
  `delivered_at`, using the `log` bus;
- the repository has no current, supported p50/p95/p99, sustained-throughput, CPU or RSS benchmark
  for the worker, and no commit-to-Redpanda baseline because that publication path does not exist;
- the current successful delivery path has high source-derived database/network interaction cost:
  with default statement-timeout configuration, a tick delivering `B` events executes `4B + 8`
  PostgreSQL commands and `B` sequential bus publications;
- the complete `apps/outbox-worker` process is not replaceable by Debezium because it also hosts
  delivery-buffer purge and run-event retention;
- current Source Import is PostgreSQL relation discovery/import only. `stream`/`kafka` in
  `SourceObject` is reserved contract vocabulary, not an executable source capability.

Consequently:

> #2614 may build an isolated Debezium PoC, but no performance or simplification claim is accepted
> until #2615 executes the frozen current-vs-candidate corpus below. The lack of a current
> percentile/resource benchmark is recorded as an AS-IS fact, not replaced by invented numbers.

No production code, schema, dependency, runtime configuration or default compose file is changed by
this evidence.

## 2. Baseline and evidence classes

### 2.1 Immutable baseline

- Repository: `dunay2/dvt`
- Main: `ffee4ee479b683e3346d5a96749229f798d4ca41`
- Main refreshed: `2026-08-23`; no SHA drift from issue creation
- Study branch: `docs/debezium-fit-assessment-20260823`

### 2.2 Evidence classification

This report separates three classes deliberately:

| Class | Meaning | Allowed conclusion |
|---|---|---|
| `measured-live` | Accepted local-Docker observation or immutable CI result | State the exact observed result and environment only |
| `source-derived` | Deterministic count/behavior derived from the current code path | State the formula/invariant; do not call it a latency benchmark |
| `frozen-gate` | Numerical acceptance threshold fixed before candidate results | Use in #2615; do not describe as current performance |

This prevents three common errors:

1. treating test-suite duration as event-delivery throughput;
2. turning one canary observation into a percentile distribution;
3. selecting thresholds after seeing Debezium results.

## 3. Hypothesis verification

| #2613 hypothesis | Result | Source-backed conclusion |
|---|---|---|
| Run events and outbox rows share one transaction | **Confirmed** | `PostgresRunStateCoordinator.bootstrapRunTx()` and `appendAndEnqueueTx()` append canonical events/snapshots and call `outboxStore.enqueueWithClient()` inside the same `withTransaction()` boundary. |
| `PostgresOutboxStore` owns mutable delivery state | **Confirmed** | It owns transactional enqueue, claim leases, retries, delivered markers, DLQ, replay, tenant-affine shards and per-run head-of-line ordering. |
| `@dvt/delivery` owns polling/processing/retry/runtime | **Confirmed** | `OutboxWorker`, runtime loop, hooks, retry classification and contracts are located in the Delivery package. |
| `apps/outbox-worker` owns the executable host | **Confirmed** | It composes PostgreSQL, worker/runtime, event bus, ownership fencing, health/readiness, metrics, purge and retention. |
| Current production bus factory lacks Kafka/Redpanda | **Confirmed** | `createOutboxEventBus()` selects only `HttpEventBus` or `LoggingEventBus`; environment schema accepts only `http` or `log`. |
| Delivery is at-least-once and needs idempotency | **Confirmed** | Publish succeeds before `markDelivered`; a crash in that window causes redelivery. Runbook/manual require downstream dedupe by `eventId` or `idempotencyKey`. |
| Active warehouse provider is PostgreSQL | **Confirmed** | Current Source Import probe rejects any `type !== 'postgres'`. |
| Current import is relation-only | **Confirmed** | ADR-0058 and #2173 classify current support as PostgreSQL + relation, targeting Graph Draft or dbt project files. |
| Stream locator is reserved, not delivered | **Confirmed** | `SourceObject` publishes a `stream` locator/protocol vocabulary, while no active probe/import/runtime implements it. |
| #2173 owns current source authority | **Confirmed** | #2173 owns connection catalog, credentials, live relation discovery, connection-bound identity and import hardening. |

No hypothesis required correction to #2612–#2617.

## 4. Current delivery authority and semantics

## 4.1 Canonical event authority

The canonical shared event shape is `EventEnvelope` in
[`RunStateVocabulary.v1.ts`](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/contracts/src/contracts/engine/RunStateVocabulary.v1.ts).
It contains, among other fields:

```text
eventId
eventType
runId
runSeq
emittedAt
persistedAt
tenantId
projectId
environmentId
planId
planVersion
engineAttemptId
logicalAttemptId
idempotencyKey
payloadVersion
payload
```

These fields are domain contracts and survive either delivery implementation.

`PostgresRunStateCoordinator` performs the decisive transaction:

```text
BEGIN
  append canonical run event(s)
  update/rebuild snapshot where applicable
  insert outbox row(s) through enqueueWithClient
COMMIT
```

Debezium must not replace this authority. At most it replaces post-commit distribution progression.

## 4.2 Mutable outbox queue

Current `PostgresOutboxStore` is not an immutable event table. It owns mutable queue state:

```text
attempts
last_error
next_attempt_at
claimed_at
delivered_at
```

and the separate `outbox_dead_letter` table.

Its claim query also enforces:

- `FOR UPDATE SKIP LOCKED`;
- stale claim recovery after the configured claim timeout;
- optional persisted shard filtering;
- no later `runSeq` while an earlier row in the same `tenantId + runId` remains undelivered;
- no further run delivery while the run has a dead-letter row.

A Debezium Outbox Event Router candidate therefore requires an isolated insert-only table or a hard
forward migration. Pointing Event Router at the current table is not a valid compatibility test.

## 4.3 Delivery loop

Current `OutboxWorker` processes each claimed record sequentially:

```text
for each record
  await bus.publish([record.payload])
  await storage.markDelivered([record.id])
```

Although storage and bus APIs use arrays, the current worker invokes both with one record. The HTTP
bus therefore performs one HTTP request per event, not one request per claimed batch.

After processing the batch, the worker performs a separate pending-retry query. The runtime then
sleeps for `pollIntervalMs`; default values are:

```text
batchSize       = 100
pollIntervalMs  = 1,000
errorBackoffMs  = 5,000
stopOnError     = false
HTTP timeout    = 10,000
max attempts    = 10
stale claim     = 5 minutes
```

The default statement/query timeout passed to the PostgreSQL adapter is `0`.

## 4.4 At-least-once crash window

The publish and delivered-marker operations are intentionally non-atomic:

```text
publish succeeds
  -> process crashes before delivered_at update
  -> row is claimed again
  -> same event is published again
```

Required current contract:

- same `eventId` / `idempotencyKey` + same content: idempotent duplicate;
- same identity + different content: conflict, never last-write-wins;
- duplicate observations must be measurable;
- no claim of universal end-to-end exactly-once delivery.

Debezium does not remove this requirement. Connector/offset failure recovery can also redeliver.

## 4.5 Retry and dead-letter

`MAX_OUTBOX_ATTEMPTS = 10`.

The retry delay is source-derived from:

```text
min(60 seconds, 2 ^ attemptsBeforeFailure)
```

The scheduled delays before the tenth failed attempt are therefore:

```text
1, 2, 4, 8, 16, 32, 60, 60, 60 seconds
```

Total scheduled delay before the final attempt: `243 seconds`, excluding poll/processing time.
On the terminal failure, the event is inserted into `outbox_dead_letter` and removed from the active
outbox in the same transaction.

## 4.6 Sharding and ownership

ADR-0033 establishes:

```text
tenantId -> persisted shardId
configured shard ownership -> PostgreSQL advisory-lock fencing
same tenant/run -> one shard -> ordered processing
```

The current worker is not merely a timer around a queue. It has an explicit active/passive deployment
contract, session-bound shard leases, readiness behavior and rollback-by-process-stop evidence.

## 5. Current executable host: publication versus other responsibilities

The standalone process currently owns these concerns:

### Publication-specific or strongly publication-coupled

- claim/poll loop;
- HTTP/log bus selection;
- publish timeout/error classification;
- retry/backlog observation;
- tenant-affine shard selection;
- advisory-lock publication fencing;
- outbox health/readiness/metrics;
- current outbox canary and runbook.

### Responsibilities that survive a Debezium publication cutover

- delivery-buffer retention/purge;
- outbox/DLQ cleanup until the old schema is fully retired;
- run-event hot-retention/archive scheduling;
- canonical run-event persistence and snapshots;
- projector runtime, which is a separate delivery package concern;
- start-run backpressure/admission policy, although its data source must be rewritten if mutable
  outbox backlog stops being authoritative.

Therefore `apps/outbox-worker` cannot be counted as wholly deletable. A production cutover must first
move or retain housekeeping/retention with one explicit owner.

## 6. Current bus gap

Current architecture documents select PostgreSQL authority and Kafka/Redpanda distribution, and the
repository contains a PostgreSQL + Redpanda prototype compose. However, the executable production
worker currently exposes only:

```text
DVT_OUTBOX_EVENT_BUS_MODE=http
DVT_OUTBOX_EVENT_BUS_MODE=log
```

There is no Kafka/Redpanda `IEventBus` implementation at the reviewed baseline.

This creates three real alternatives for #2616:

1. retain HTTP as the product delivery boundary;
2. add a small native Kafka/Redpanda `IEventBus` and keep the custom queue;
3. adopt Debezium and delete the custom delivery queue/runtime after proof.

The Debezium candidate must be compared with option 2 conceptually. If it adds Connect/slot/WAL
operations but does not delete the polling/claim/retry/fencing machinery, it is strictly more complex.

## 7. Source acquisition AS-IS

## 7.1 Delivered source path

Current Source Import is:

```text
PostgreSQL connection
  -> server-resolved credential
  -> live relation discovery
  -> SourceObject(locator.kind = relation)
  -> connection-bound import selection
  -> Graph Draft or dbt project files
```

[`WorkspaceWarehouseConnectionProbe`](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts)
rejects non-PostgreSQL types and builds relational `SourceObject` values. It does not configure logical
replication, publications, slots, connectors, topics or offsets.

## 7.2 Reserved stream vocabulary

`SourceObjectCatalog.v1.ts` contains:

```text
locator.kind = stream
protocol = kafka | pulsar | other
```

That type is an adapter extension boundary only. Current API routes, catalog, probe, import strategies,
Planner, Web and runtime do not implement a stream-source lifecycle.

Consequences for #2617:

- topic name cannot become the sole source identity;
- CDC source work must reuse #2173 connection/credential/source authority;
- snapshot, offset, replay, schema evolution and finite-versus-continuous execution require an
  independent product decision;
- success of the internal outbox PoC does not approve a CDC source product.

## 8. Source, owner and candidate-disposition inventory

The disposition below is conditional on a future approved Debezium hard cut. `candidate delete` does
not authorize deletion now.

| Source / symbol | Current role and owner | Candidate disposition |
|---|---|---|
| ADR-0002 / ADR-0003 | PostgreSQL authority, distribution bus, transactional outbox | **retain unchanged** |
| ADR-0033 | Current shard/fencing authority | **retain until decision; supersede for publication only if Debezium is adopted** |
| `EventEnvelope` / run identity | Canonical shared contract | **retain unchanged** |
| `PostgresRunStateCoordinator` | Atomic canonical event + snapshot + outbox creation | **retain; adapt only the insert-only outbox writer if adopted** |
| `PostgresOutboxStore.enqueueWithClient` | Same-transaction outbox insert | **retain concept; simplify implementation/schema if adopted** |
| `PostgresOutboxStore.listPendingForClaim` | Claim lease, shard and order selection | **candidate delete** |
| `markDelivered`, `markFailed`, retry/DLQ/replay | Mutable publication progression | **candidate delete/redefine; no misleading second failure authority** |
| Existing outbox migrations | Applied schema history | **retain historical migrations; use one forward migration** |
| `OutboxWorker` | Sequential claim/publish/mark loop | **candidate delete** |
| Delivery runtime loop/hooks/error support | Poll scheduling and worker lifecycle | **candidate delete for outbox publication** |
| `IEventBus` / `IOutboxStorage` | Current custom delivery ports | **candidate simplify/delete after consumer audit; no forwarding compatibility layer** |
| `HttpEventBus`, `LoggingEventBus`, factory | Current sink implementations | **candidate delete from production publication** |
| `PgShardOwnershipGate` and shard runtime | Current single-publisher fencing | **candidate delete for publication after connector ownership is proven** |
| Worker monitor/health/readiness/metrics | Current queue/owner truth | **rewrite around connector/task, slot/WAL and topic lag** |
| `StartRunAdmissionGuard` | Protects run admission from pending count/oldest outbox age | **retain policy; rewrite data source if outbox backlog model changes** |
| `PostgresBackpressureSnapshotReader` | Reads mutable outbox backlog | **candidate rewrite** |
| Delivery-buffer purge | Removes delivered/dead-letter retention state | **must retain/move until old state is retired** |
| Run-event retention runtime | Archives/purges canonical run history | **must retain/move; unrelated to publication** |
| `ProjectorWorkerRuntime` | Independent projection concern | **retain; outside outbox publication cut** |
| Worker canary/order/idempotency tests | Current executable semantics | **preserve semantic cases; replace topology-only assertions** |
| Accepted local-Docker evidence | Historical current-path proof | **retain immutable** |
| PostgreSQL + Redpanda prototype compose | Experimental infrastructure | **prototype; extend only in isolated #2614 profile** |
| ADR-0058 / Source Import contracts | Provider-neutral catalog boundary | **retain** |
| `SourceObject.stream` locator | Future-reserved vocabulary | **retain inactive; do not claim delivered support** |
| `WorkspaceWarehouseConnectionProbe` | Current PostgreSQL relation probe | **retain; #2173 owner** |
| Archived G5/CDC documents | Historical context | **retain historical; never use as current authority** |

## 9. Footprint baseline

Bytes are Git object payload sizes. They measure navigation/maintenance surface, not business value or
guaranteed deletion.

| Surface | Count / bytes | Interpretation |
|---|---:|---|
| `apps/outbox-worker/src/**/*.ts` | 25 files / **103,555 B** | Complete host: publication, ownership, ops, purge and retention. Upper bound only. |
| `apps/outbox-worker/test/**/*` | 30 files / **213,367 B** | Host/canary/ordering/idempotency/ops plus housekeeping evidence. Not wholly removable. |
| Direct outbox delivery slice in `@dvt/delivery/src` | 8 files / **25,093 B** | Poller/runtime/contracts/shard assignment candidate surface. |
| Direct outbox tests/support in `@dvt/delivery/test` | 9 files / **33,658 B** | Candidate replacement/deletion only after equivalent connector evidence. |
| `PostgresOutboxStore.ts` | 1 file / **17,253 B** | Mixes retained transactional enqueue with removable mutable delivery state. Must be split by responsibility, not deleted wholesale. |
| PostgreSQL backpressure reader + SQL | 2 files / **7,061 B** | Policy data source candidate rewrite. |
| **Production source affected upper bound** | 36 files / **152,962 B** | Includes surviving responsibilities; not a deletion claim. |
| **Known tests affected lower bound** | 39 files / **247,025 B** | Excludes PostgreSQL adapter outbox tests and docs; not a deletion claim. |

A valid simplification claim must count mechanisms and surviving ownership, not merely remove bytes.

Minimum mechanisms that must disappear after an adopted hard cut:

```text
custom polling publisher
mutable claim lease
per-record delivered marker
custom retry scheduler for publication
publication shard/fencing runtime
HTTP/log production publication modes
```

If those mechanisms remain, prefer a native Kafka `IEventBus` over adding Debezium.

## 10. Measured current evidence

## 10.1 Accepted local-Docker canary

Evidence:
[`ED-20260312-g5-canary-local-docker.md`](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/docs/evidence/supporting/ED-20260312-g5-canary-local-docker.md)

Environment:

```text
PostgreSQL 16 local Docker
one active compiled worker
one shard
log event bus
poll interval default
```

Observed single event:

```text
outbox created_at      2026-03-12T23:07:41.074Z
delivered_at           2026-03-12T23:07:41.424Z
created -> delivered   0.350 s
attempts               0
runtime errors delta   0
ready/owner             true/true
```

This proves one real successful local delivery and ownership path. It does **not** establish p50/p95,
throughput, HTTP latency, Redpanda latency, CPU or memory.

## 10.2 Immutable CI evidence nearest the release head

Release preparation PR #2611 produced the immutable CI run used here; final `main` differs by release
metadata/merge finalization, while the reviewed source paths are the same.

### Worker package

[GitHub Actions job](https://github.com/dunay2/dvt/actions/runs/32581953598/job/97052781679)

```text
Node             22.23.2
pnpm             10.28.0
Vitest           3.2.4
build            12 tasks successful, 3 cached, 16.724 s
test files       20 passed, 2 skipped
tests            147 passed, 3 skipped
test duration    8.45 s
```

Skipped service-backed tests include the real worker end-to-end integration and PostgreSQL ownership
integration when `DATABASE_URL` is absent. The default CI result is therefore strong functional unit/
canary evidence, but not a live publication benchmark.

### Delivery package

[GitHub Actions run](https://github.com/dunay2/dvt/actions/runs/32581953598)

```text
test files       10 passed
tests            56 passed
duration         2.60 s
```

### PostgreSQL adapter package

[GitHub Actions job](https://github.com/dunay2/dvt/actions/runs/32581953598/job/97052781439)

```text
PostgreSQL       15.19 service container
test files       46 passed
tests            292 passed
duration         23.74 s
```

This includes real-PostgreSQL atomic append/enqueue, claim, mark-delivered, retry, stale-claim,
head-of-line ordering, dead-letter and replay tests. Test duration includes setup/schema work and is
not event latency.

## 10.3 Metrics that do not currently exist

| Required metric | Current evidence status |
|---|---|
| p50/p95/p99 commit-to-sink | **Not measured**; only one 350 ms log-sink observation |
| sustained events/second | **Not measured** |
| burst/backlog drain rate | **Not measured** |
| HTTP sink p50/p95/p99 | **Not measured** |
| commit-to-Redpanda latency | **Not applicable: publisher absent** |
| worker CPU | **Not measured** |
| worker RSS | **Not measured** |
| idle CPU/RSS | **Not measured** |
| PostgreSQL commands/round trips | **Source-derived below; must be validated with `pg_stat_statements` in #2615** |

This absence is the reason the frozen benchmark corpus exists. It is not permission to retrofit a
favorable baseline after the candidate runs.

## 11. Source-derived current cost

## 11.1 Transaction behavior

`PostgresAdapterClientSession.withTransaction()` and `.withClient()` both use the same transactional
client path:

```text
BEGIN
[SET LOCAL statement_timeout when configured > 0]
operation queries
COMMIT
```

The worker default statement timeout is `0`, so the `SET LOCAL` command is absent by default.
Every outbox storage operation also enters the PostgreSQL maintenance service context through a SQL
command.

## 11.2 Successful tick formula

Let `B` be the number of events claimed and delivered in one tick, with `1 <= B <= 100`.

### Claim batch

```text
BEGIN
maintenance context
claim CTE / UPDATE ... RETURNING
COMMIT
= 4 PostgreSQL command round trips
```

### Each event

```text
one sequential bus publish
BEGIN
maintenance context
UPDATE outbox SET delivered_at ...
COMMIT
= 1 bus call + 4 PostgreSQL command round trips
```

### Retry-backlog check after batch

```text
BEGIN
maintenance context
SELECT EXISTS(... pending retries ...)
COMMIT
= 4 PostgreSQL command round trips
```

### Total

```text
PostgreSQL commands = 4B + 8
bus publications    = B, sequential
```

Examples:

| Delivered in tick | PostgreSQL commands | Bus calls |
|---:|---:|---:|
| 1 | 12 | 1 |
| 10 | 48 | 10 |
| 100 | 408 | 100 |

If `DVT_PG_STATEMENT_TIMEOUT_MS > 0`, one `SET LOCAL` is added to each of the `B + 2`
transactions:

```text
PostgreSQL commands = 5B + 10
```

Pool acquisition/release and wire payload bytes are not included.

## 11.3 Idle active-worker formula

An empty tick still performs:

```text
empty claim transaction       4 commands
pending-retry check           4 commands
```

With the default one-second poll interval:

```text
approximately 8 PostgreSQL commands/second per active idle worker
```

This is a source-derived interaction count, not measured CPU/I/O.

## 11.4 Source-derived throughput ceiling

Default maximum claim is 100 records. The runtime sleeps one second after the tick, even when work was
processed. Ignoring all processing and network time, one active worker therefore cannot exceed
approximately `100 events/s` at default settings. Sequential bus calls and `4B + 8` database commands
make the actual ceiling lower.

The accepted canary does not measure this ceiling.

## 12. Current operator/setup baseline

A current active worker requires at minimum:

```text
DVT_OUTBOX_OWNERSHIP_MODE=active
DATABASE_URL=<server-owned PostgreSQL URL>
DVT_PG_SCHEMA=dvt
DVT_OUTBOX_EVENT_BUS_MODE=http|log
DVT_OUTBOX_HTTP_TARGET_URL=<required for http>
DVT_OUTBOX_SHARD_COUNT=<persisted topology>
DVT_OUTBOX_OWNED_SHARD_IDS=<required when shard count > 1>
```

Operational responsibilities:

- run/verify migrations according to deployment policy;
- guarantee one owner per shard through advisory locks;
- expose `/healthz`, `/readyz` and metrics on default port `9464`;
- monitor pending/retry/dead-letter age/count;
- operate HTTP sink credentials/timeouts or accept log-only behavior;
- run delivery-buffer purge and run-event retention;
- stop the worker to release ownership during rollback.

There is no current connector, publication, replication slot, Connect cluster or Redpanda topic
ownership in this production host.

## 13. Frozen benchmark corpus for #2615

The following corpus is fixed before Debezium results. #2615 may add diagnostic cases but may not
weaken or silently replace these cases.

All generated records must be valid current `EventEnvelope` values. Payload size is controlled by a
non-semantic fixture field and refers to final serialized event size.

| ID | Corpus | Purpose |
|---|---|---|
| `W0-idle` | 10 minutes, no events | Idle DB interactions, CPU, RSS, health |
| `W1-latency` | 300 events, inserted one at a time with no backlog, 1 KiB, 30 runs round-robin | p50/p95/p99 latency |
| `W2-batch` | 100 events, 100 independent runs, 2 KiB | One default claimed batch and interaction count |
| `W3-order-backlog` | 10,000 events = 1,000 runs × `runSeq 1..10`, interleaved, 2 KiB | Sustained throughput, backlog drain, per-run order |
| `W4-payload` | 1,000 events, 100 runs × 10, 16 KiB | Serialization/network/WAL sensitivity |
| `W5-rollback` | 100 committed and 100 rolled-back transactional outbox writes | Transaction boundary |
| `W6-faults` | 1,000 events with publisher/connector, PostgreSQL and sink/bus restarts at fixed checkpoints | Loss, duplicates, recovery |
| `W7-malformed` | One isolated malformed routing/payload row followed by valid rows | Fail-visible poison-record posture |

### 13.1 Current path

```text
PostgreSQL 16
current worker
DVT_OUTBOX_WORKER_BATCH_SIZE=100
DVT_OUTBOX_WORKER_POLL_INTERVAL_MS=1000
DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS=5000
DVT_PG_STATEMENT_TIMEOUT_MS=0
DVT_PG_QUERY_TIMEOUT_MS=0
one shard / one active owner
local deterministic HTTP sink recording receive timestamp, event identity and content digest
```

`log` mode is retained only as a sanity/canary lane because it is not a comparable external sink.

### 13.2 Candidate path

```text
same PostgreSQL major/corpus/resource host
isolated insert-only candidate outbox
one dedicated publication and slot
pinned Kafka Connect + Debezium PostgreSQL connector
Outbox Event Router
pinned Redpanda
one governed consumer recording timestamp, partition, offset, key, event identity and content digest
```

Exact Debezium/Connect/Redpanda image digests are owned by #2614 and must be recorded before its first
result. No `latest` tags.

### 13.3 Repetition and timing

- discard at least two warm-up runs;
- perform at least five measured runs for `W2`–`W4`;
- `W1` uses all 300 observations for percentile calculation;
- use the same host and resource limits for paired current/candidate runs;
- capture monotonic harness time at successful transaction commit;
- current completion: HTTP sink receives and validates the event;
- candidate completion: governed Redpanda consumer receives and validates the event;
- also record current `delivered_at` and candidate connector/offset progression separately;
- raw observations must be stored in machine-readable form; summary-only prose is insufficient.

## 14. Frozen acceptance gates

These are evaluation floors, not claims about current production capacity.

| Dimension | Frozen gate |
|---|---|
| Event loss | `0` missing committed events in every corpus/fault case |
| Rollback isolation | `0` emitted events from rolled-back transactions |
| Duplicate semantic effects | `0`; every observed duplicate is recognized by stable identity and identical digest |
| Identity conflict | Same event identity with different digest is a hard failure |
| Ordering | `0` `runSeq` inversions or unexplained gaps per `tenantId + runId` |
| No-backlog latency (`W1`) | p50 `<= 1,000 ms`; p95 `<= 2,000 ms`; p99 `<= 5,000 ms` |
| Sustained throughput (`W3`) | `>= 50 validated events/s` over the full corpus |
| Backlog drain (`W3`) | 10,000 events drained in `<= 240 s` |
| Recovery | Progress resumes in `<= 60 s` after a bounded worker/connector or bus restart; no manual outbox-row repair |
| Poison record | Failure is visible in `<= 30 s`; later-event behavior and recovery are deterministic and documented |
| Current interaction formula | `4B + 8` default DB commands is validated or corrected with `pg_stat_statements` evidence |
| Candidate DB simplification | At least `90%` reduction in post-commit delivery-state SQL commands under `W2/W3`; no claim/delivered/retry updates hidden elsewhere |
| Idle candidate budget | Connect + Debezium incremental average CPU `<= 0.25 vCPU`; incremental RSS `<= 1.5 GiB` during `W0` |
| WAL bound in PoC | `max_slot_wal_keep_size = 2 GiB`; warning at `>= 1 GiB`; critical at `>= 1.6 GiB`; no unbounded `-1` posture |
| WAL correctness | Slot never reaches lost/unrecoverable status in accepted cases; teardown removes the slot/publication |
| Observability | Connector/task, slot activity, retained WAL, source position, consumer lag and failure state visible within `30 s` |
| Publisher ownership | Exactly one canonical publication path active in every test/canary state |
| Simplification | Poller, mutable claim/delivery/retry state, publication fencing and HTTP/log publication are deleted in an adopted hard cut |
| Housekeeping ownership | Purge and run-event retention have one surviving executable owner before old host deletion |

### 14.1 Comparative interpretation

Because the current repository has no Kafka/Redpanda publisher, current HTTP and candidate Redpanda
measure different delivery endpoints. Therefore:

- absolute gates above are mandatory;
- current-vs-candidate latency/resource comparison is evidence, not a fake identical-sink claim;
- source-derived database interaction reduction is directly comparable;
- #2616 must also compare Debezium operational cost with the smaller native Kafka `IEventBus`
  alternative;
- Debezium is rejected as “simplification” if it does not remove the current delivery mechanisms.

## 15. Open work and ownership overlap

### Current worker owner

[#409](https://github.com/dunay2/dvt/issues/409) remains the current outbox-worker authority. It
explicitly excludes a CDC runtime family. Its remaining work is CI/documentation reconciliation
(#447, #448, #413), not a Debezium migration.

### Source authority

[#2173](https://github.com/dunay2/dvt/issues/2173) remains the relation connection/discovery/import
owner. It explicitly classifies current support as PostgreSQL + relation and broader locators as
inactive/future-reserved.

### Debezium programme

- #2614 owns the isolated compatibility PoC and exact version pinning;
- #2615 owns execution of the frozen current/candidate benchmark and fault matrix;
- #2616 owns the only retain/adopt/defer/reject decision and delete-first migration;
- #2617 owns the independent CDC-source product gate.

### Other related but non-overlapping work

- #2478 measures PostgreSQL-native compression for hot JSONB including current outbox payloads; it
  does not own publication semantics.
- No open PR matched direct `outbox` or `Debezium` implementation at the refreshed baseline.

## 16. Readiness decision

### #2614 dependency result

`#2613 dependency`: **satisfied**.

The PoC may start only when #2614 additionally records:

- exact Kafka Connect, Debezium and Redpanda image digests;
- local CPU/memory limits;
- disposable schema/table, publication, slot, topic and teardown names;
- no production database, credentials or default runtime changes.

### Production migration result

**Not Ready.** No production cutover is approved. It remains blocked by #2614, #2615 and explicit
#2616 product/operations approval.

## 17. #2613 Definition of Done reconciliation

- [x] exact main SHA refreshed and unchanged;
- [x] all hypotheses verified from source, tests and active architecture;
- [x] source/owner/disposition inventory recorded;
- [x] current functional/CI/live evidence and its limits recorded;
- [x] current bus gap stated precisely;
- [x] publication separated from purge/retention/projector responsibilities;
- [x] source/test footprint recorded without treating bytes as deletable value;
- [x] current database/bus interaction formula derived;
- [x] crash-window, retry, DLQ, ordering and ownership semantics frozen;
- [x] unavailable p50/p95/p99/events/s/CPU/RSS evidence stated explicitly;
- [x] one reproducible benchmark corpus and numerical gates frozen before candidate results;
- [x] #409/#2173 overlap reconciled without changing their scope;
- [x] no product code, dependency, schema, runtime or default compose change;
- [x] no hypothesis correction required for #2612–#2617.

## 18. References

### Current DVT sources

- [ADR-0002 — PostgreSQL authority, Kafka distribution](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/infra/docker/postgres/redpanda/docs/adr/ADR-0002-postgres-authority-kafka-bus.md)
- [ADR-0003 — Transactional outbox](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/infra/docker/postgres/redpanda/docs/adr/ADR-0003-transactional-outbox.md)
- [ADR-0033 — Sharding and fencing](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/docs/adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md)
- [Outbox-worker runbook](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/docs/runbooks/outbox-worker-g5.md)
- [Outbox-worker technical manual](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/docs/guides/outbox-worker-technical-manual-20260404.md)
- [`EventEnvelope`](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/contracts/src/contracts/engine/RunStateVocabulary.v1.ts)
- [`PostgresRunStateCoordinator`](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts)
- [`PostgresOutboxStore`](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/adapter-postgres/src/PostgresOutboxStore.ts)
- [`PostgresAdapterClientSession`](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/adapter-postgres/src/PostgresAdapterClientSession.ts)
- [`OutboxWorker`](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/delivery/src/application/OutboxWorker.ts)
- [`OutboxWorkerRuntime`](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/delivery/src/application/OutboxWorkerRuntime.ts)
- [Delivery contracts](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/delivery/src/contracts.ts)
- [Worker environment contract](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/apps/outbox-worker/src/plugins/env.ts)
- [Event-bus factory](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/apps/outbox-worker/src/runtime/createOutboxEventBus.ts)
- [HTTP bus](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/apps/outbox-worker/src/bus/HttpEventBus.ts)
- [Worker runtime composition](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts)
- [Current local-Docker canary](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/docs/evidence/supporting/ED-20260312-g5-canary-local-docker.md)
- [ADR-0058 — Source Import rails](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/docs/adr/ADR-0058-warehouse-source-import-rails.md)
- [`SourceObject` catalog](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/packages/%40dvt/contracts/src/contracts/source-import/SourceObjectCatalog.v1.ts)
- [Current PostgreSQL source probe](https://github.com/dunay2/dvt/blob/ffee4ee479b683e3346d5a96749229f798d4ca41/apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts)

### Work ownership

- [#409 — current outbox-worker authority](https://github.com/dunay2/dvt/issues/409)
- [#2173 — current Warehouse Connection and Source Import authority](https://github.com/dunay2/dvt/issues/2173)
- [#2612 — Debezium evaluation epic](https://github.com/dunay2/dvt/issues/2612)
- [#2614 — isolated Debezium PoC](https://github.com/dunay2/dvt/issues/2614)
- [#2615 — correctness/performance/WAL evaluation](https://github.com/dunay2/dvt/issues/2615)
- [#2616 — retain/adopt/defer/reject decision](https://github.com/dunay2/dvt/issues/2616)
- [#2617 — CDC source product gate](https://github.com/dunay2/dvt/issues/2617)

## 19. Final conclusion

The current worker is functionally stronger than a casual “replace the poller” description suggests,
but it also pays a clear custom-infrastructure cost.

At default configuration, the source-derived delivery shape is:

```text
one committed outbox event
  -> periodic database claim
  -> sequential external publication
  -> separate transactional delivered update
  -> separate retry-backlog query
```

For a full default batch:

```text
100 events
408 PostgreSQL commands
100 sequential bus calls
```

Debezium has a credible opportunity only if it removes that post-commit queue machinery and closes
the missing Redpanda path while preserving DVT's transaction, identity and order contracts. If it is
added without deleting those mechanisms—or if its Connect/slot/WAL cost is not justified—the smaller
native Kafka `IEventBus` alternative is architecturally preferable.
