---
title: ADR-0066 - PostgreSQL Stable-Table Publication
status: Proposed
date: 2026-09-03
owners:
  - architecture
  - contracts
  - adapter-postgres
  - temporal
arc_level: ARC-1
---

# ADR-0066 - PostgreSQL Stable-Table Publication

## Status

Proposed.

The contract is frozen for the first implementation. Repository ADR governance
requires an implementing file before `Accepted`; issue #2723 owns that transition.

## Context

VTX2 can identify a selected graph output, but it does not yet define how one run
publishes that output to a current PostgreSQL relation. Publication must prevent a
late, stale run from overwriting newer data and must not break grants, indexes or
dependent readers by replacing the relation object.

The existing object-file loader is not this authority. Its staging-only
`DROP TABLE`/`CREATE TABLE` behavior is prior art, not a reusable publication rail.
PostgreSQL execution continues to use the governed `ConnectionRef` and immutable run
context; no environment fallback or second connection authority is added.

## Decision

### 1. V1 publishes into one stable, DVT-managed table

The logical target is the exact governed connection, schema and table. DVT creates
the table on its first publication and preserves that physical object thereafter.
The table OID is stable across later publications.

The table comment is reserved for this machine-readable marker:

```text
dvt:publication:v1;token=<sha256>;schema=<sha256>
```

The publication token binds the admitted semantic document, selected output, target
and run attempt. The schema digest binds ordered column names, PostgreSQL types,
nullability and DVT-declared constraints. User-facing descriptions remain DVT
metadata in V1; they do not share the reserved table comment.

An existing relation is replaceable only when it is a table owned by the governed
role and has a valid DVT marker. Any absent marker, wrong relation kind, unexpected
owner or metadata drift is an unmanaged collision and fails closed.

### 2. Admission supplies compare-and-swap intent

The immutable execution workload carries:

- the exact target and selected output;
- the new publication token and schema digest;
- the expected predecessor token, or `absent` for first publication.

The expected token is observed before execution is admitted. It is not inferred from
completion time and is not a mutable global sequence.

### 3. Candidate creation precedes the critical section

The activity evaluates the output into a run-scoped temporary candidate table. It
validates row shape and exact PostgreSQL assignment compatibility before touching the
logical target. Candidate failure leaves the target unchanged.

### 4. One short transaction owns publication

The publication transaction:

1. acquires a transaction-level advisory lock derived from the exact target;
2. inspects relation kind, owner, DVT marker and schema digest;
3. compares the current token with the admitted predecessor token;
4. creates the first managed table, or deletes and inserts its rows from the
   candidate using an explicit ordered column list;
5. writes the new marker and commits rows plus token atomically.

The two-integer advisory key is derived from SHA-256 of connection identity, schema
and table. A hash collision may serialize unrelated targets but cannot weaken safety.
The transaction does not wait for user input or perform transformation work.

`DELETE` plus `INSERT` preserves the table object. It deliberately avoids `TRUNCATE`,
`DROP`, `ALTER` and rename-based swaps, whose stronger locks or object replacement
would violate the reader and dependency guarantees.

### 5. Failure is non-destructive

- A stale predecessor yields `STALE_PUBLICATION` without mutation.
- An unmanaged collision yields `UNMANAGED_PUBLICATION_TARGET`.
- Schema or managed-metadata drift yields `PUBLICATION_SCHEMA_MISMATCH`.
- Insufficient privileges yield `PUBLICATION_PERMISSION_DENIED`.
- Any database error rolls back both rows and marker.

V1 performs no automatic schema migration. The operator must select a new target or
wait for a separately governed migration capability.

### 6. Guarantees are bounded

Readers using ordinary PostgreSQL MVCC see the previously committed rows until the
publication commits and the new rows afterwards; they do not observe the intermediate
delete. Concurrent writers are serialized by PostgreSQL and the DVT advisory lock.

DVT-created indexes and constraints, grants and read dependencies survive because the
table object survives. Unexpected triggers, rules, columns, constraints or indexes
are drift and reject publication. External foreign-key behavior remains PostgreSQL
behavior and may make publication fail atomically.

This contract does not promise historical versions, rollback, retention, garbage
collection, zero write amplification, unbounded scale or non-blocking concurrent
writes.

### 7. The existing runtime rail remains canonical

Publication is an internal effect of the existing `IWorkflowEngine.startRun` command:

```text
StartRun -> Temporal workflow -> PostgreSQL publication activity
```

Issue #2524 owns workload fields, #2723 owns the activity and evidence, and #2725 must
be narrowed to this stable-table contract. No publication command, query, registry,
store or generic adapter framework is introduced.

## Rejected alternatives

- **Managed immutable physical versions plus logical swap:** more cleanup, retention,
  dependency and recovery policy than current product requirements justify.
- **Drop/create or table rename:** changes identity, strands dependencies and grants,
  and requires stronger locks.
- **Stable view over version tables:** preserves view identity but still needs stale
  writer fencing and introduces version lifecycle work.
- **Table-and-replace without ownership or compare-and-swap:** allows collisions and
  late stale overwrite.

## Consequences

The first implementation is small and provider-native, while preserving the database
objects consumers already reference. Large replacements still incur PostgreSQL WAL,
dead tuples and writer contention; measurement can motivate a later, separately
governed strategy without weakening this contract silently.

## Verification obligations

Behavior tests must cover stale completion, unmanaged collision, incompatible schema,
wrong permissions, transaction rollback, concurrent reader visibility, stable OID,
preserved grants/indexes/constraints/dependent views and target-scoped serialization.
Tests assert outcomes and database state, not SQL literals.

## References

- [PostgreSQL explicit and advisory locking](https://www.postgresql.org/docs/16/explicit-locking.html)
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/16/transaction-iso.html)
- [PostgreSQL comments](https://www.postgresql.org/docs/16/sql-comment.html)
- [ADR-0064](./ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md)
- [VTX2 publication study](../planning/proposals/mandatory/runtime-and-contracts/vtx2-postgresql-publication-contract-study-20260903.md)
