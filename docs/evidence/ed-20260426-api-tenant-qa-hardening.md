---
title: API tenant QA hardening
status: Accepted
date: 2026-04-26
owners:
  - packages/@dvt/adapter-postgres
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts
  - packages/@dvt/adapter-postgres/src/PostgresTenantIsolationPolicy.ts
  - packages/@dvt/adapter-postgres/src/StartRunIntentSchemaManager.ts
  - packages/@dvt/adapter-postgres/src/sqlUtils.ts
  - packages/@dvt/adapter-postgres/src/migratePostgresRuntimeStores.ts
  - packages/@dvt/adapter-postgres/src/index.ts
  - packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresSchemaManager.rollback.test.ts
  - packages/@dvt/adapter-postgres/test/StartRunIntentSchemaManager.test.ts
  - packages/@dvt/adapter-postgres/test/migratePostgresRuntimeStores.test.ts
  - apps/api/src/runtime/intentReconcilerRuntime.ts
  - apps/api/src/modules/buildProtectedRuntimeModule.ts
  - apps/api/test/modules/buildProtectedRuntimeModule.cases.ts
  - docs/adr/ADR-0004-event-sourcing-strategy.md
  - docs/planning/reviews/architecture-and-governance/20260426-api-tenant-review.md
  - docs/risk-register/quality/r-20260426-start-run-intent-rollback-asymmetry.md
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api typecheck
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

# Summary

This ARC-2 evidence closes the tenant QA hardening follow-up for the Postgres
adapter and the API runtime bootstraps that depend on it.

The slice does four things:

1. makes the run-events tenant-leading index explicit through `core_020`;
2. hardens generated RLS SQL so both schema and table identifiers are quoted;
3. makes hardening migration metadata honest about idempotent reapplication and
   no-downgrade rollback semantics;
4. adopts an explicit dual-store migration helper in the real API bootstraps
   that create both the state store and the start-run intent store.

# What This Evidence Closes

1. `run_events` now has the tenant-leading index required by tenant-scoped
   sequence and idempotency lookups.
2. RLS SQL generation no longer leaves table names unquoted.
3. The idempotency contract is now explicit in ADR-0004: `runId` is globally
   unique across tenants, so `(runId, idempotencyKey)` remains the canonical
   deduplication shape.
4. `core_018`/`core_019` and the start-run intent hardening migrations no
   longer describe themselves as if each step preserved a historical policy
   snapshot.
5. Rollback tests now prove the hardening steps reapply policy rather than
   silently downgrading tenant isolation.
6. The duplicated SQL string-literal helper is removed in favor of one shared
   implementation.
7. `apps/api` now uses `migratePostgresRuntimeStores(...)` in the two runtime
   bootstraps that create both stores, so the migration order is no longer a
   caller-memory convention in those paths.

# Residual Risk

The start-run intent schema manager still has no `rollbackTo` capability. That
residual asymmetry is recorded separately in
`docs/risk-register/quality/r-20260426-start-run-intent-rollback-asymmetry.md`.
