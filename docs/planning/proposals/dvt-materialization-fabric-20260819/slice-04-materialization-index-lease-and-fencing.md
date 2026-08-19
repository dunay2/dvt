---
title: S04 - Materialization index, lease and fencing
status: Conditional GO; blocked by S01-S03 contracts
owner: State Store / Engine / Architecture / Reliability
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
parent_epic: 2486
tasks: [2496, 2497, 2498]
---

# S04 — Materialization index, lease and fencing

## Decision

**Conditional GO.** Use the existing PostgreSQL state-store boundary for a small scope-safe invocation-to-result index and a separate lease with monotonic fencing. Do not store datasets in PostgreSQL, hold database locks during execution or claim exactly-once execution.

Implementation is blocked until S01–S03 freeze invocation identity, manifest verification, artifact observations and reference semantics.

## Need

The CAS answers:

> Do these bytes exist under this digest?

The materialization index must answer:

> Within this authorized scope, which independently verified `ResultManifest` currently satisfies this exact `InvocationDigest`?

Concurrency adds a second problem. Two equivalent runs may miss simultaneously and execute the same expensive work. A unique final row prevents duplicate index entries but does not:

- prevent duplicate producers;
- let followers wait for the healthy producer;
- stop an expired producer from confirming a late result after takeover;
- coordinate idempotent publication across PostgreSQL and S3.

## Current source audit

Baseline: [`main@af2a7f85ea5a2cfb5a5e9a888f702c078814b426`](https://github.com/dunay2/dvt/tree/af2a7f85ea5a2cfb5a5e9a888f702c078814b426).

DVT already contains useful PostgreSQL concurrency and tenancy patterns:

- `packages/@dvt/adapter-postgres/src/PostgresSnapshotWorkQueue.ts` uses transactional claims and `FOR UPDATE ... SKIP LOCKED` to distribute bounded queue work.
- State-store adapters already establish tenant/service execution context and migration conventions.
- Engine/Temporal already own workflow retries and execution state.

Those mechanisms are prior art, not a complete materialization lease. A timestamp claim token or `SKIP LOCKED` queue row is not a monotonic fence checked by the final index confirmation.

No current source owns:

- a table keyed by scope plus `InvocationDigest`;
- `ELIGIBLE/QUARANTINED/RETIRED` result lifecycle;
- a single-flight lease for an invocation;
- a strictly increasing fencing token;
- a crash-consistency matrix spanning S3 publication and PostgreSQL confirmation.

## Architectural fit

```text
PostgreSQL materialization index
  -> mutable lookup/lifecycle metadata only

S3/CAS
  -> immutable outputs and ResultManifest bytes

lease table
  -> temporary producer ownership and fencing epoch

application publication service
  -> executes outside transactions, then verifies and confirms conditionally

Temporal
  -> orchestrates run/activity retries, not materialization ownership semantics
```

The index is an optimization and evidence locator, not a second run-state authority. If opportunistic lookup/index/lease is unavailable, a step executes normally when policy permits. A stored plan that explicitly pins reuse follows the stricter S08 failure semantics.

## Proposed schema boundary

Illustrative index:

```text
materialization_invocations
  tenant_id
  trust_domain
  invocation_digest
  result_manifest_digest
  result_manifest_uri
  semantic_profile_id
  semantic_profile_version
  compatibility_policy_version
  status              -- VERIFYING | ELIGIBLE | QUARANTINED | RETIRED
  producer_fencing_token
  created_at
  verified_at
  last_used_at
  quarantined_at
```

Key and disclosure boundary:

```text
PRIMARY/UNIQUE (tenant_id, trust_domain, invocation_digest)
```

Intrinsic invocation identity remains independent from authorization, but V1 never performs a global digest lookup or reveals whether another scope has a candidate.

Illustrative lease:

```text
materialization_leases
  tenant_id
  trust_domain
  invocation_digest
  owner_id
  fencing_token bigint
  acquired_at
  heartbeat_at
  expires_at
```

Every ownership epoch receives a strictly larger database-generated token. Renew/release/final confirmation require the current owner and token. Expiry uses database time, not worker clocks.

## Open-source convergence

### PostgreSQL primitives to reuse

- unique/check/foreign-key constraints and transactions;
- row locking and `SKIP LOCKED` for bounded claim/recovery jobs;
- atomic `INSERT ... ON CONFLICT` or conditional `UPDATE ... WHERE fencing_token = ?`;
- database sequences/identity or locked per-key epoch update for monotonic fencing;
- existing DVT tenant/RLS/service-context conventions.

Official reference: [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html) and [`SELECT` locking clauses](https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE).

### Concepts to reuse, not import wholesale

- Bazel ActionCache as prior art for action-to-result lookup;
- established distributed-system fencing-token pattern;
- Temporal activity retry/cancellation for execution orchestration.

### Rejected mechanisms

- session/advisory lock held for the full external computation;
- database transaction held while reading S3, calling HTTP or running dbt;
- Redis as a second mutable authority;
- last-write-wins result replacement;
- exactly-once claims;
- globally shared cross-tenant action cache.

## Complexity

| Dimension | Complexity | Main risk |
|---|---:|---|
| Index schema/lookup | Medium | Scope leakage or incompatible result replacement. |
| Lease protocol | High | Split ownership, expiry and waiter behavior. |
| Fencing | High | Late stale producer confirming an invalid epoch. |
| Crash consistency | Very high | PostgreSQL/S3 have no shared transaction. |
| Operations | High | Orphans, renewal, takeover and quarantine. |
| Performance | Medium | Hot-key contention and polling amplification. |

## What exists and what is missing

| Capability | Exists | Missing |
|---|---|---|
| PostgreSQL migrations/adapters | Yes | Materialization index/lease schema and ports. |
| Tenant context | Yes | Scope-safe non-disclosing lookup semantics. |
| Queue claims with `SKIP LOCKED` | Yes | Per-invocation single-flight and monotonic fence. |
| Engine retries | Yes | Publication recovery state machine. |
| CAS conditional writes | Yes | Conditional verified index confirmation. |
| Event idempotency | Existing patterns | Complete duplicate-publication/event fault proof. |

## Task decomposition

1. [#2496](https://github.com/dunay2/dvt/issues/2496) adds the scope-safe PostgreSQL materialization index.
2. [#2497](https://github.com/dunay2/dvt/issues/2497) adds lease acquisition, renewal, takeover, waiting and monotonic fencing.
3. [#2498](https://github.com/dunay2/dvt/issues/2498) proves crash consistency and stale-producer rejection through fault injection.

## Required state transitions

```text
lookup
  ├── ELIGIBLE candidate -> independently verify -> hit or quarantine/reject
  ├── active lease -> bounded wait/recheck
  └── miss -> acquire lease/fence
                 -> execute outside DB transaction
                 -> publish immutable outputs/manifest
                 -> independently verify
                 -> confirm ELIGIBLE only with current fence
```

Conflicting manifests for the same exact invocation are an integrity incident. The index must never overwrite one with another silently. Identical confirmation retries are idempotent.

## Verification

The fault harness must inject before and after:

1. lease acquisition;
2. execution start/end;
3. each output upload;
4. manifest upload;
5. independent verification;
6. index confirmation;
7. event emission;
8. renewal/takeover;
9. pin acquisition/release;
10. orphan cleanup.

Concurrency gates:

```text
100 identical concurrent requests
  -> 1 confirmed producer result
  -> 99 bounded wait/reuse outcomes

stale producer confirmed after takeover = 0
eligible row with absent/corrupt output = 0
conflicting final results for one invocation = 0
unauthorized scope observation = 0
```

Performance observations must include lookup p95, lease acquisition/renewal, waiter count, hot-key contention, PostgreSQL round trips and bypass rate. Polling/backoff must be bounded and cancellable.

## Stop and narrow conditions

Stop or narrow when:

- a strictly monotonic fence cannot be enforced at final confirmation;
- a transaction/connection must remain open during external work;
- failover/clock assumptions make takeover unsound;
- hot-key coordination costs more than duplicate work for the first vertical—disable single-flight for that profile rather than weakening correctness;
- index availability becomes mandatory for ordinary execution;
- the design duplicates Temporal scheduling or current run-state storage.

## Gate result

```text
gateDecision: conditional-go
gateScope: postgres-index-and-single-flight
authorizedImplementation: false
blocksOn:
  - S01 InvocationDigest
  - S02 verifier/publication contract
  - S03 artifact verification and pins
```
