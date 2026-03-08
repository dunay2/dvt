---
title: State Store Extraction
status: Archived
canonical: false
owner: Architecture / Delivery / Docs
last_reviewed: 2026-03-08
doc_type: working-extraction
source_origin: historical state-store draft material curated into this document
superseded_by:
  - docs/adr/ADR-0013-run-state-store-bootstrapRunTx.md
  - docs/architecture/engine/contracts/state-store/overview.md
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts
---

# State Store Extraction

This archived working note preserves useful reasoning from an older state-store
draft that no longer belongs in the active architecture tree.

This document extracts the material worth keeping from historical state-store
draft material and aligns it with the current repository state.

Its purpose is practical:

1. keep the useful ideas,
2. separate them from stale or conflicting details,
3. give us one working base for follow-up edits.

This document is not a new canonical contract by itself.
Accepted ADRs, implemented TypeScript contracts, and code-aligned adapter docs
still take precedence.

> WARNING
> This is a curated working doc, not a canonical source of truth.
> Canonical references for the current state-store baseline are:
> `ADR-0013`, `packages/@dvt/engine/src/ports/IRunStateStore.ts`,
> `docs/architecture/engine/contracts/state-store/overview.md`, and
> `packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`.

## 1. Current Baseline In The Repo

Before extracting anything from the historical draft material, the current
baseline is:

- `IRunStateStore` already exposes `bootstrapRunTx`, `appendAndEnqueueTx`,
  `getRunMetadataByRunId`, `listEvents`, `listRuns`, and `getSnapshot`.
- `ADR-0013` already accepts atomic bootstrap semantics.
- `@dvt/adapter-postgres` already implements the state store and is treated as
  closed/implemented in current status docs.
- Snapshot projection already exists in-process; the remaining gap is mostly
  operational/productization, not core semantics.

Useful active references:

- [`docs/adr/ADR-0013-run-state-store-bootstrapRunTx.md`](../../adr/ADR-0013-run-state-store-bootstrapRunTx.md)
- [`packages/@dvt/engine/src/ports/IRunStateStore.ts`](../../../packages/@dvt/engine/src/ports/IRunStateStore.ts)
- [`packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`](../../../packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts)
- [`packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
- [`docs/architecture/system-delivery-status.md`](../../architecture/system-delivery-status.md)

## 2. What Is Worth Keeping

The historical draft material is useful mainly as a consolidated narrative. The
following points are worth preserving.

### 2.1 State Store As Truth Boundary

Keep this framing:

- the state store is the execution truth boundary;
- provider runtimes are not authoritative for status;
- snapshots are derived acceleration structures, not the source of truth;
- event ordering belongs to the append authority, not to external timestamps.

This is still fully aligned with current ADRs and code.

### 2.2 Core Responsibilities

The most useful extracted responsibility list is:

- persist run metadata,
- persist immutable ordered run events,
- expose event replay,
- expose latest snapshot for hot reads,
- enforce idempotency,
- preserve tenant-safe read/write behavior,
- atomically enqueue outbox records with persisted events.

This is the right functional boundary for the state store layer.

### 2.3 Core Invariants

These are the best ideas to preserve from the pack and keep using as review
criteria:

1. Event log immutability.
2. Monotonic per-run ordering.
3. No duplicate `(runId, runSeq)`.
4. No duplicate semantic event for the same idempotency key.
5. Tenant-scoped reads and writes only.
6. Atomic append plus outbox enqueue.
7. Snapshot derived from persisted events.
8. Snapshot consistent with a prefix of the persisted event log.
9. Write-shape guardrails: callers do not supply authoritative persistence
   fields.
10. Provider outages must not erase read availability from persisted state.

These invariants are more valuable than the pack's proposed filenames or
physical schema names.

### 2.4 Transaction Model

The pack is directionally correct to emphasize two write paths:

- `bootstrapRunTx`
- `appendAndEnqueueTx`

And to insist that:

- initial metadata plus first events plus outbox rows are atomic,
- subsequent event appends remain atomic with outbox enqueue,
- partial success between persist and publish is not acceptable inside the
  contract boundary.

That logic is already reflected in the implemented adapter and should remain a
hard architectural rule.

### 2.5 Snapshot Semantics

The strongest reusable snapshot rules are:

- snapshot is not authoritative over the event log;
- missing snapshot is valid;
- read path must support replay fallback when snapshot is missing;
- snapshot rebuild must be deterministic from ordered events;
- operational tooling should exist to rebuild snapshots from persisted history.

This remains directly useful for G7 and for future operational hardening.

### 2.6 Tenant Isolation Stance

The historical draft material is useful in how explicit it is about tenant
safety:

- every table/query path must carry tenant scope,
- application-layer tenant checks are necessary,
- database enforcement such as RLS is recommended where feasible,
- admin tooling must stay tenant-scoped as well.

This should remain visible in whatever canonical state-store writeup we keep.

### 2.7 Testing Expectations

The pack's testing sections are useful as a checklist, especially:

- contract tests for write-shape rejection,
- idempotency duplicate handling,
- monotonic ordering under concurrency,
- snapshot null path and replay fallback,
- failure/rollback behavior,
- replay determinism,
- tenant-isolation checks,
- outbox coupling checks.

This is one of the better parts of the pack because it converts architecture
ideas into verifiable obligations.

### 2.8 Operational Surfaces

These operational capabilities are worth carrying forward:

- snapshot rebuild tooling,
- outbox lag inspection,
- failed outbox delivery inspection,
- monotonic sequence health checks,
- duplicate idempotency-rate observation,
- runbook material for recovery and incident response.

The historical draft material is strong when it treats the state store as
operationally critical, not just a data model.

## 3. Candidate Extracted Text We Can Keep Working From

The following is the cleaned-up substance that still seems valid.

### 3.1 Working Architectural Statement

The state store is the persistence authority behind execution.

It owns:

- authoritative event ordering,
- persisted run metadata,
- replayable event history,
- derived snapshots for hot reads,
- atomic append plus outbox coupling,
- tenant-safe access boundaries.

It does not own:

- planning,
- provider execution,
- business policy inference,
- UI behavior,
- external delivery semantics beyond the atomic outbox boundary.

### 3.2 Working Contract Statement

The write contract should continue to distinguish:

- caller-supplied event input,
- store-assigned persistence metadata.

Callers provide semantic event intent.
The store assigns authoritative persistence fields such as:

- `runSeq`,
- `persistedAt`.

The store must reject any write shape that attempts to inject those values
directly.

### 3.3 Working Atomicity Statement

Atomicity is required in two places:

- bootstrap path,
- subsequent append path.

For bootstrap:

- insert metadata,
- append first events,
- enqueue outbox records for appended events,
- commit as one unit.

For subsequent appends:

- append events,
- dedupe by idempotency key,
- enqueue downstream records for newly appended events only,
- commit as one unit.

### 3.4 Working Snapshot Statement

Snapshots are read acceleration only.

They are allowed to optimize:

- `getRunStatus`,
- dashboard reads,
- list/filter reads,
- operator views.

They must never become the truth source over the append-only event log.

If a snapshot is unavailable:

- replay fallback is valid,
- behavior must remain correct,
- latency may degrade but semantics must not.

### 3.5 Working Failure Model

Useful preserved failure assumptions:

- duplicate logical retry must not create duplicate persisted events;
- crash after provider dispatch but before bootstrap requires intent
  reconciliation;
- crash between append and enqueue must be prevented by atomicity;
- missing snapshot must degrade to replay;
- provider unavailability must not block persisted-state status reads.

### 3.6 Working Test Obligations

The minimal meaningful state-store test obligations should remain:

- duplicate idempotency collision returns existing persisted event identity;
- per-run ordering remains monotonic under concurrent appends;
- tenant scope violations are rejected or empty;
- snapshot rebuild is deterministic;
- append plus outbox stays transactionally coupled;
- replay uses persisted order only;
- read path behaves correctly when snapshot is missing.

## 4. What Should Be Discarded Or Rewritten

The original draft set is not safe to adopt as-is. These parts must be treated
as stale or rewritten before reuse.

### 4.1 Physical Schema Names

Do not copy the historical reference SQL draft as canonical implementation
guidance.

Reasons:

- it uses `workflow_snapshots`, while the adapter currently uses
  `run_snapshots`;
- it uses `outbox_events`, while the adapter currently uses `outbox`;
- it does not model the current `outbox_dead_letter` table directly;
- it assumes a different physical shape than the code actually queries.

Conclusion:

- keep the logical concepts,
- discard the pack's DDL as a source of truth.

### 4.2 Historical Draft ADR On Append Authority And Atomic Outbox

Do not keep the historical draft ADR on append authority and atomic outbox as a
live proposal in its current form.

Why:

- append authority and bootstrap atomicity are already covered by accepted
  material, especially `ADR-0013`;
- keeping both would create parallel decision sources for the same rule set.

What to salvage instead:

- the language around append authority,
- the explicit rejection of caller-provided sequencing,
- the emphasis on atomic append plus outbox coupling.

### 4.3 Historical Sprint Backlog As Planning Source

Do not use the historical sprint backlog as an active roadmap.

Why:

- several of its Sprint 1 and Sprint 2 items are already implemented or closed
  in current status docs;
- it reflects a historical sequencing, not the current roadmap.

What to salvage:

- the operational hardening themes,
- the emphasis on rebuild tooling, retention, and certification-style tests.

### 4.4 Historical Persisted-Event Schema Draft

Do not adopt the historical persisted-event JSON schema draft as canonical
without rewriting it.

Why:

- it is materially thinner than the current TypeScript contract;
- it omits fields that are part of the current event envelope vocabulary.

What to salvage:

- the distinction between persisted event shape and caller write shape,
- the idea that persisted records should be externally schema-checkable.

## 5. Useful Open Questions To Drive Next Iteration

These are the best next-step questions to work from.

### 5.1 Canonical Physical Naming

Do we want to normalize future docs around:

- current implementation names (`run_snapshots`, `outbox`, `outbox_dead_letter`),
  or
- more domain-explicit names (`workflow_snapshots`, `outbox_events`)?

If renaming is desired, it must be treated as migration work, not a doc-only
cleanup.

### 5.2 Snapshot Table Shape

Should snapshot reads continue to rely mainly on:

- a single JSON payload plus watermark,

or should we denormalize more columns such as:

- `status`,
- `substatus`,
- `message`,
- timestamps,
- maybe per-view query helpers?

This matters for G7 and for API/UI query performance.

### 5.3 Run Identity And Tenant Keys

Do we want the long-term storage model to treat `run_id` as:

- globally unique across tenants, or
- tenant-scoped composite identity?

Current implementation and some draft docs do not express the same answer
cleanly.

### 5.4 Canonical State-Store Documentation Shape

What should become canonical:

- the contract docs under `docs/architecture/engine/contracts/state-store/`,
- a code-aligned adapter guide,
- or a new curated state-store architecture document derived from this
  extraction?

My recommendation: keep contracts and adapter docs canonical, and use this
extraction only to curate what is missing.

### 5.5 Operational Backlog Still Worth Keeping

These still look worthwhile as real backlog items:

- snapshot rebuild tooling,
- replay certification tests,
- retention and archival policy,
- index and partitioning review,
- outbox lag metrics and state-store operational dashboards,
- runbooks for recovery paths.

## 6. Proposed Working Direction

If we continue from this document, the next sensible move is:

1. decide the canonical state-store document set,
2. lift the useful invariants into the chosen canonical docs,
3. explicitly drop the stale DDL and sprint backlog from the historical draft
   set,
4. turn the remaining valuable operational and testing material into actionable
   backlog or runbook items.

That gives us a controlled extraction instead of another parallel documentation
tree.

## 7. Source Map

Primary historical draft inputs:

- a state-store architecture draft covering invariants, transaction model,
  snapshots, and testing expectations;
- a draft ADR covering append authority and atomic outbox coupling;
- a historical sprint backlog for the state-store track;
- a state-store test matrix draft;
- a persisted-event JSON schema draft;
- a reference SQL draft.

Active repo references used to curate the extraction:

- [`docs/adr/ADR-0013-run-state-store-bootstrapRunTx.md`](../../adr/ADR-0013-run-state-store-bootstrapRunTx.md)
- [`packages/@dvt/engine/src/ports/IRunStateStore.ts`](../../../packages/@dvt/engine/src/ports/IRunStateStore.ts)
- [`packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`](../../../packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts)
- [`packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`](../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
- [`docs/architecture/system-delivery-status.md`](../system-delivery-status.md)

## 8. Bottom Line

The historical state-store draft material is worth mining, but not worth
adopting raw.

What survives extraction:

- architectural framing,
- invariants,
- transaction semantics,
- snapshot rules,
- tenant-isolation stance,
- testing and operational checklists.

What does not survive extraction:

- the reference DDL as implementation truth,
- the proposed ADR as a separate live architecture source,
- the sprint backlog as current planning,
- the JSON schema as canonical persisted-event definition.
