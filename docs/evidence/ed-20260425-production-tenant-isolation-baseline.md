---
title: Production tenant isolation baseline
status: Accepted
date: 2026-04-25
owners:
  - packages/@dvt/adapter-postgres
  - packages/@dvt/engine
  - packages/@dvt/contracts
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
  - packages/@dvt/adapter-postgres/src/PostgresRunEventStoreSql.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunEventStorage.ts
  - packages/@dvt/engine/src/ports/IStartRunIntentStore.ts
  - packages/@dvt/engine/src/domain/startRunIntentPolicy.ts
  - packages/@dvt/adapter-postgres/src/PostgresMaintenanceAccess.ts
  - packages/@dvt/adapter-postgres/src/PostgresServiceAccessCapability.ts
  - packages/@dvt/adapter-postgres/src/PostgresOutboxStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts
  - packages/@dvt/adapter-postgres/test/PostgresTenantIsolationPolicy.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresServiceAccessCapability.architecture.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts
  - packages/@dvt/adapter-postgres/test/S19F1SnapshotWorkQueueClosure.integration.test.ts
  - packages/@dvt/adapter-postgres/vitest.config.ts
  - packages/@dvt/adapter-postgres/test/StartRunIntentSchemaManager.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresStartRunIntentStore.context.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresRunEventStore.test.ts
  - packages/@dvt/contracts/test/start-run-intent-ownership.architecture.test.ts
  - packages/@dvt/engine/test/state/InMemoryStartRunIntentStore.test.ts
  - packages/@dvt/engine/test/core/WorkflowEngine.intentLog.test.ts
  - packages/@dvt/engine/test/services/RunMaintenanceService.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresBackpressureSnapshotReader.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts
  - scripts/provision-postgres-app-role.cjs
  - .github/workflows/test.yml
  - .github/workflows/pr-quality-gate.yml
  - .github/workflows/adapter-postgres-integration-nightly.yml
  - docs/risk-register/quality/R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE.yaml
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts StartRunIntentSchemaManager.test.ts PostgresStartRunIntentStore.context.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- PostgresStartRunIntentStore.context.test.ts PostgresRunEventStore.test.ts
    - pnpm --filter @dvt/engine test -- InMemoryStartRunIntentStore.test.ts WorkflowEngine.intentLog.test.ts RunMaintenanceService.test.ts
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm verify:prepush
    - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts PostgresBackpressureSnapshotReader.test.ts PostgresStateStoreAdapter.migrate.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts PostgresAdapterClientSession.test.ts PostgresStateStoreAdapter.migrate.test.ts PostgresOutboxStore.test.ts PostgresRunSnapshotStore.test.ts PostgresRunSnapshotStore.cas-guard.test.ts
    - pnpm --filter @dvt/adapter-postgres build
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-postgres test -- PostgresServiceAccessCapability.architecture.test.ts PostgresTenantRlsEnforcement.integration.test.ts
    - pnpm --filter @dvt/contracts test -- start-run-intent-ownership.architecture.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- PostgresServiceAccessCapability.architecture.test.ts PostgresTenantIsolationPolicy.test.ts PostgresStateStoreAdapter.migrate.test.ts StartRunIntentSchemaManager.test.ts PostgresTenantRlsEnforcement.integration.test.ts
    - '$env:DVT_PG_INTEGRATION="1"; $env:DVT_PG_URL="postgresql://dvt_app:dvt@localhost:5432/dvt"; $env:DATABASE_URL="postgresql://dvt_app:dvt@localhost:5432/dvt"; pnpm --filter @dvt/adapter-postgres test'
    - '$env:DVT_PG_ADMIN_URL="postgresql://dvt:dvt@localhost:5432/dvt"; $env:DVT_PG_APP_USER="dvt_app"; $env:DVT_PG_APP_PASSWORD="dvt"; node scripts/provision-postgres-app-role.cjs'
---

# Summary

This ARC-2 evidence covers the production tenant-isolation baseline for the
Postgres adapter. Tenant-owned online state now has a canonical RLS catalog,
transaction-local tenant/service contexts, top-level `tenant_id` on the
derived tables that previously could not be protected by database policy, and
forced RLS on the start-run intent log.

The 2026-04-25 follow-up hardcut removes the remaining
`IStartRunIntentStore.v1.ts` and `StartRunIntentPolicy.v1.ts` copies from
`@dvt/contracts`. The canonical behavior port and transition policy now live
only in `@dvt/engine`, and `docs/contracts/engine/index.md` is generated from
that owner path.

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
   own forced RLS migration through `StartRunIntentSchemaManager`, and uses
   tenant-scoped command/query operations through `StartRunIntentRef`; only
   orphan sweeping uses the explicit service-context session.
7. Run-event sequence and idempotency lookups include explicit `tenant_id`
   predicates before `run_id`, so correctness does not rely solely on ambient
   RLS filtering.
8. Service-context activation now goes through `PostgresMaintenanceAccess` and
   a closed `POSTGRES_SERVICE_ACCESS` catalog. The generic factory is not
   exported, `PostgresSchemaManager` no longer exposes service-context
   activation, the package root does not export maintenance authority, and an
   architecture test rejects API imports or production bypasses around the
   maintenance entrypoint.
9. `PostgresTenantRlsEnforcement.integration.test.ts` adds a real PostgreSQL
   direct-access proof for `run_metadata`: tenant context sees only own rows,
   missing context sees zero rows, and service context sees all rows. This test
   runs under `DVT_PG_INTEGRATION=1` with a non-`BYPASSRLS` role.
10. `core_018_service_access_owner_rls_hardening` and
    `20260425_004_start_run_intents_service_owner_rls_hardening` re-apply RLS
    policies so service mode also requires an approved
    `dvt.service_access_owner`.
11. The follow-up Docker QA run uses a non-superuser, non-`BYPASSRLS`
    `dvt_app` role. This exposed stale test fixtures that wrote through
    implicit superuser authority; those fixtures now use explicit tenant
    context, and the adapter Postgres Vitest config gives real integration
    tests a 30s timeout only when `DVT_PG_INTEGRATION=1`.
12. CI jobs that run Postgres integration now provision and use the same
    non-superuser, non-`BYPASSRLS` application role. The service-container
    superuser remains only bootstrap/admin authority, not the role used by RLS
    enforcement tests.

# What Remains Open

1. `plan_records` and `stored_plans` still need top-level
   tenant/project/environment ownership. That is a separate plan-store contract
   and repository task.
2. Production deployment should still split tenant application and maintenance
   database roles. The closed TypeScript catalog and RLS owner predicate reduce
   accidental drift, but arbitrary SQL running under the same database role can
   still forge transaction-local settings. Superuser/`BYPASSRLS` roles are
   invalid for direct RLS enforcement proof.
3. Archive/restore service-role drills and timing-oracle tests are outside this
   slice and remain follow-up hardening work.
