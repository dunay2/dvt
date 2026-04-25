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
  - packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts
  - packages/@dvt/adapter-postgres/test/PostgresTenantIsolationPolicy.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts
  - docs/risk-register/quality/R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE.yaml
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts PostgresAdapterClientSession.test.ts PostgresStateStoreAdapter.migrate.test.ts PostgresOutboxStore.test.ts PostgresRunSnapshotStore.test.ts PostgresRunSnapshotStore.cas-guard.test.ts
    - pnpm --filter @dvt/adapter-postgres build
    - pnpm --filter @dvt/adapter-postgres test
---

# Summary

This ARC-2 evidence covers the production tenant-isolation baseline for the
Postgres adapter. Tenant-owned online state now has a canonical RLS catalog,
transaction-local tenant/service contexts, and top-level `tenant_id` on the
derived tables that previously could not be protected by database policy.

# What This Evidence Closes

1. `PostgresTenantIsolationPolicy` defines the tenant-owned online tables and
   the single RLS policy shape used by migrations.
2. `PostgresSchemaManager` adds `core_017_tenant_rls_baseline`, backfills
   tenant ownership from canonical metadata/payload fields, rejects orphan rows
   by enforcing `NOT NULL`, and enables RLS without owner-force assumptions.
3. `PostgresAdapterClientSession.withClient` now opens an explicit transaction,
   so `set_config(..., true)` remains local and visible for the full operation.
4. Outbox, lineage, archive, snapshot, staleness, and snapshot-work paths set
   explicit tenant or service context before touching RLS-protected tables.

# What Remains Open

1. `plan_records` and `stored_plans` still need top-level
   tenant/project/environment ownership. That is a separate plan-store contract
   and repository task.
2. Production deployment must run with a non-owner application role. Table-owner
   connections remain migration-only.
3. Archive/restore service-role drills and timing-oracle tests are outside this
   slice and remain follow-up hardening work.
