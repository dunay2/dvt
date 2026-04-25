---
title: Production tenant isolation baseline
status: Accepted
date: 2026-04-25
owners:
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresTenantIsolationPolicy.ts
  - packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts
  - packages/@dvt/adapter-postgres/src/PostgresAdapterClientSession.ts
  - packages/@dvt/adapter-postgres/src/PostgresBackpressureSnapshotReader.ts
  - packages/@dvt/adapter-postgres/src/PostgresBackpressureSnapshotReaderSql.ts
  - packages/@dvt/adapter-postgres/src/StartRunIntentSchemaManager.ts
  - packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts
  - packages/@dvt/adapter-postgres/test/PostgresTenantIsolationPolicy.test.ts
  - packages/@dvt/adapter-postgres/test/StartRunIntentSchemaManager.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.context.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresBackpressureSnapshotReader.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts
  - docs/risk-register/quality/R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE.yaml
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts StartRunIntentSchemaManager.test.ts PostgresStartRunIntentStore.context.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts PostgresBackpressureSnapshotReader.test.ts PostgresStateStoreAdapter.migrate.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts PostgresAdapterClientSession.test.ts PostgresStateStoreAdapter.migrate.test.ts PostgresOutboxStore.test.ts PostgresRunSnapshotStore.test.ts PostgresRunSnapshotStore.cas-guard.test.ts
    - pnpm --filter @dvt/adapter-postgres build
    - pnpm --filter @dvt/adapter-postgres test
---

# Summary

This ARC-2 evidence covers the production tenant-isolation baseline for the
Postgres adapter. Tenant-owned online state now has a canonical RLS catalog,
transaction-local tenant/service contexts, top-level `tenant_id` on the
derived tables that previously could not be protected by database policy, and
forced RLS on the start-run intent log.

# What This Evidence Closes

1. `PostgresTenantIsolationPolicy` defines the tenant-owned online tables and
   the single forced RLS policy shape used by migrations.
2. `PostgresSchemaManager` adds `core_017_tenant_rls_baseline`, backfills
   tenant ownership from canonical `run_metadata`, treats stale JSON tenant
   values as mismatch evidence, rejects orphan rows by enforcing `NOT NULL`,
   and enables `FORCE ROW LEVEL SECURITY`.
3. `PostgresAdapterClientSession.withClient` now opens an explicit transaction,
   so `set_config(..., true)` remains local and visible for the full operation.
4. `PostgresBackpressureSnapshotReader` now reads through an explicit
   service-context transaction and joins outbox to metadata by `run_id` and
   `tenant_id`.
5. Outbox, lineage, archive, snapshot, staleness, and snapshot-work paths set
   explicit tenant or service context before touching RLS-protected tables.
6. `start_run_intents` is included in the tenant-isolation catalog, gets its
   own forced RLS migration through `StartRunIntentSchemaManager`, and is read
   or mutated only through an explicit service-context session.

# What Remains Open

1. `plan_records` and `stored_plans` still need top-level
   tenant/project/environment ownership. That is a separate plan-store contract
   and repository task.
2. Production deployment should still run with a non-owner application role for
   least privilege. Table-owner connections remain migration-only; forced RLS
   prevents owner bypass from being the primary isolation assumption.
3. Archive/restore service-role drills and timing-oracle tests are outside this
   slice and remain follow-up hardening work.
