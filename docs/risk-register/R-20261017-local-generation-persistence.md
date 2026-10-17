---
title: LOCAL generation persistence admission risks
status: Open
owner: API / Data Infrastructure
last_reviewed: 2026-10-17
---

# LOCAL generation persistence admission risks

Related: #3393, #3392, #3398. Component:
[Transactional LOCAL generations](../../apps/api/src/infrastructure/duckdb/README.generations.md).

## Risk and current posture

The persistence candidate remains uncomposed and LOCAL stays off. A catalog
manifest is not proof of provider EOF, temporal consistency or authority over
remote rows. The composition root must bind lease/principal/scope and route every
operation through the protected application boundary before product enablement.

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
