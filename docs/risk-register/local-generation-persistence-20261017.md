---
title: LOCAL generation persistence admission risks
status: Open
owner: API / Data Infrastructure
last_reviewed: 2026-10-17
---

# LOCAL generation persistence admission risks

Related: #3393, #3392, #3398, #3394. Component:
[Transactional LOCAL generations](../../apps/api/README.md#transactional-local-generations).

## Risk and current posture

Persistence is internally composed and LOCAL stays off by default. A catalog
manifest is not proof of provider EOF, temporal consistency or authority over
remote rows. The composition root binds lease/principal/scope for capture and
exact metadata reads. Future operations must retain that application boundary.

Transaction commit and grant revocation are separate authorities. Checkpoints are
revalidated before work and before commit, but cannot make remote revocation
atomic with DuckDB. Cooperative abort does not impose a native execution timeout.

Per-capture budgets are not aggregate disk/RSS quotas. No orphan deletion or GC is
implemented. Old generations and failed captures remain on disk. #3398 must own
admission, retention and active-reader coordination before sustained usage.

## Failure handling and evidence needed

Stale CAS, schema/count mismatch and denied commit must not expose partial READY
metadata. Native transaction failures remain explicit. A post-COMMIT connection
or storage error is an ambiguous result, not evidence of rollback; resolve the
persisted capture before retrying. Corrupt/foreign version or scope is rejected,
not repaired or replaced with an empty store.

Native test execution, killed-process recovery, full API source/test typecheck,
lint, security/ARC, prepush and final review are acceptance gates, not properties
inferred from this document. No claim of disk-full, power-loss, spill, upgrade
compatibility or performance validation is made by subcut A alone.

## Catalog loss and incomplete bootstrap (subcut B)

A zero metadata-table count is not proof of a new workspace. The adapter rejects
partial reserved schemas and missing/extra/view-substituted metadata objects,
without rebuilding metadata over retained data. The guard is applied to reads as
well as initialization. Catalog repair and migrations require a separate design.

Residual limit: deleting both reserved schemas removes the internal evidence of
prior initialization. Detecting complete destruction requires an independent
trusted authority not introduced here. Structure checks do not authenticate all
contents/constraints, prove host integrity, or justify deleting orphan relations.

## Bulk-write boundary (#3394-A)

The Appender can perform implicit casts. Actual physical column order, names,
types and nullability are checked before constructing it; the schema check is
shared with promotion. Catalog and schema validation are not general attestation
against arbitrary trusted-process DDL or constraint changes. No SQL surface is
exposed to callers to mutate physical relations.

Flush and close must stay inside the same transaction as capture-counter updates
and the final authorization check. A native failure must reach rollback, not be
swallowed or replaced by row INSERT fallback. Chunk construction, append and
flush are synchronous; bounded input alone does not guarantee event-loop latency,
a hard native-memory quota, immediate native-object reclamation or interruption.
These remain resource/admission concerns, not demonstrated speed improvements.

The PostgreSQL codec accepts only four raw-text OIDs and trusted positional
metadata. It neither validates database grants nor verifies cursor row-description
metadata against a live source. UTF-8 decoded text bytes are not wire bytes or
RSS, and limits applied after pg materialization cannot bound network buffering.
The future reader must provide query-local parsers, snapshot/schema checks,
backpressure, cancellation and genuine EOF evidence. Do not enable acquisition
by treating fixture-to-DuckDB tests as PostgreSQL end-to-end tests.

Existing per-capture budgets and READY/CAS semantics remain unchanged. Scope and
principal binding still require the protected composition root. The Draft API
job and any skipped security/provider checks do not establish merge acceptance.

## #3394-B PostgreSQL reader residual risks

- Internal composition must bind source credentials and scope to the capture
  authorization lease. A structural checkpoint fixture is not an authorization
  token. PostgreSQL role policy and DVT permissions are different authorities.
- Lock + read-only REPEATABLE READ stabilizes one admitted relation's source
  transaction; it does not provide a global snapshot or unrestricted RLS coverage.
- A long snapshot may retain source row versions. Duration is bounded at known
  checkpoints and by server statement/idle limits, not by a hard watchdog on
  arbitrary consumer/authorizer promises. Mid-query abort is cooperative.
- Row/byte limits apply to accepted decoded data, not to PostgreSQL wire buffers,
  one huge field, DuckDB RSS or workspace disk. Host quotas remain #3398.
- Only int8/bool/text/varchar are admitted. Other tables fail explicitly; this
  is not a general production connector or full #3394 acceptance.
- Source cleanup failure prevents successful completion. Staging written before
  that failure remains unpublished and must be reconciled/cleaned by its owner.
- The native integration fixture does not establish a public capture command,
  provider EOF attestation across crashes, reauthorization/COMMIT atomicity,
  Preview LOCAL, or a hard real-time interruption guarantee.
