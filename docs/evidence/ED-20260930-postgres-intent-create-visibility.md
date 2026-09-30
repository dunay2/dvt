---
title: PostgreSQL intent creation conflict visibility
status: Draft
date: 2026-09-30
owners:
  - '@dvt/adapter-postgres'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres exec vitest run --config vitest.config.ts
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm arch:deps
    - pnpm verify:prepush
---

# PostgreSQL Intent Creation Conflict Visibility

## Governed Claim

This is a bounded correction under [#2678](https://github.com/dunay2/dvt/issues/2678),
not completion of exclusive ownership or provider reconciliation. **The candidate
must not be integrated independently:** the end-to-end diagnostic below exposes
two provider dispatches after the visibility correction. ADR-0030,
ADR-0031 and `IStartRunIntentStore.createIntent` require idempotent creation and
tenant-scoped access. The existing `IWorkflowEngine.startRun` rail remains owned
by `StartRunApplicationFlow`.

The [preimplementation plan](https://github.com/dunay2/dvt/issues/2678#issuecomment-5916601036)
contains the current/target sequence, alternatives, Fowler matrix, scope and
negative proof. Planning DB design `GH-2678-POSTGRES-INTENT-VISIBILITY` references
that existing rail; there is no new command, public type, store or schema.

## Cause And Correction

The old single-command CTE could wait for a competing INSERT to commit, suppress
its own insert, then fail to see the winner in its fallback SELECT. Under
READ COMMITTED, conflict detection can account for a row outside that command's
snapshot. A subsequent statement gets a fresh snapshot.
[PostgreSQL 16 isolation documentation](https://www.postgresql.org/docs/16/transaction-iso.html#XACT-READ-COMMITTED)
describes both properties.

Creation now returns its own INSERT result directly. Only a conflict adds one
SELECT, using the same client, transaction and tenant context. The obsolete CTE
is removed. No UPDATE-as-read, timestamp mutation, retry loop, separate pool
checkout or isolation downgrade is introduced. PostgreSQL serialization errors
under stronger isolation continue to propagate.

## Executable Evidence

The new concurrency test failed before production edits with
`IntentNotFoundError` despite a committed same-tenant row. Its two real database
connections coordinate through an observed `pg_blocking_pids` relationship,
not a sleep chosen to guess transaction ordering. The first connection holds
an uncommitted fixture row; the second calls the production adapter.

Five integration cases cover winner commit, winner rollback, a conflicting ID
from another tenant, REPEATABLE READ and SERIALIZABLE. Full row comparisons
include `xmin` and `ctid`, detecting even a no-op UPSERT of the winning row.
The existing contextual-access test also proves no fallback on fresh insertion,
one fallback on conflict, one client/transaction with tenant scope, and rollback
with original error propagation when the fallback read fails. The latter two
unit regressions also failed before the correction.

With `DVT_PG_INTEGRATION=1` and explicit test-only `DVT_PG_URL`,
`DVT_PG_ADMIN_URL`, and `DVT_PG_RLS_URL`, the full adapter suite passed:
**46 files, 303 tests, no skipped tests**. PostgreSQL 16 ran in a disposable
loopback-only container with temporary storage. The canonical
`scripts/provision-postgres-app-role.cjs` provisioned the non-owner,
non-BYPASSRLS application role for the RLS cases. An earlier full run failed
setup for two suites because that role URL was not configured; 290 tests passed
then. The configured full rerun includes both suites, rather than hiding them.

Package typecheck and changed-file ESLint passed. The canonical contract fixture
validator passed 25 checks but reported its existing missing-glossary omission.
Golden validation and hash comparison matched three implemented fixtures and
retained two deprecated baselines; the existing unimplemented retry fixture was
skipped. These are fixture checks, not Temporal service-execution evidence.
Architecture dependency validation passed. Prepush and exact-SHA mechanization
are recorded on the draft PR; passing those gates does not remove its explicit
product-safety block.

## Integration Objection From The Actual Engine Flow

After the local fix, a second deterministic diagnostic used two actual Engine
application flows, two PostgreSQL intent-store pools, shared in-memory run state
and a provider test double. The first INSERT was held before commit; the second
backend's conflict wait was observed before releasing the first transaction.

Result: **two provider calls** for the same logical intent. One caller returned
success; the other failed with `PostStartIntentPersistenceError`. The current
application discards whether intent creation returned an existing row, so correct
repository identity idempotency cannot authorize either caller to dispatch.

This is not a live Temporal or real PostgreSQL canonical-run fencing proof. It
is enough to reject the proposed independent integration boundary. The fix and
its passing repository tests are retained only as a candidate for the coordinated
ownership/outcome implementation. The issue records the amended decision; no
claim/receipt or provider-safety guarantee is inferred from a green suite.

## Limits And Integrity

Identity idempotency is not ownership. Two requests can still obtain the same
intent without an exclusive receipt. #2678 still owns durable claim/reclaim and
resource-side fencing; #2679 still owns unknown outcomes, late RPC completion
and confirmed compensation. This fix must not be cited as resolving those P0s.

No shared application database was accessed, no data migration was performed,
and no compatibility path or v2 was added. The public port and lifecycle remain
unchanged. No debt, stub, production fake, rule relaxation or hook bypass was
introduced. The existing risk remains open, and this candidate is not ready for
integration until the coordinated protocol and independent review are complete.
