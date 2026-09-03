---
title: VTX2 runtime step hard cut evidence
status: Accepted
date: 2026-09-03
owners:
  - contracts
  - api
  - adapter-postgres
  - adapter-temporal
planning_type: evidence
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/StepKindRegistry.v1.ts
  - apps/api/src/modules/planCompileCatalog.ts
  - packages/@dvt/adapter-postgres/src/PostgresObjectFileLoadingCapability.ts
  - apps/temporal-worker/src/runtime/temporalWorkerObjectFilePostgresProfile.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter dvt-temporal-worker test
    - pnpm --filter dvt-temporal-worker typecheck
    - node --test scripts/run-local-postgres.test.cjs tools/ci/repository-command-catalog.test.mjs
    - pnpm verify:prepush
---

# VTX2 runtime step hard cut evidence

## Scope

Issue #2600 removes the SQL-first runtime family after Substrait became the sole
DVT transformation authoring authority. The compile catalog, plan registry,
run-context binding, Temporal worker composition, PostgreSQL adapter and active
proof commands no longer expose the deleted family.

The three retired step kinds are rejected without aliases or bridge entries.
Persisted plans containing them fail at canonical plan validation before
Temporal dispatch. The former materialization-row query route is absent rather
than backed by a compatibility read model.

## Surviving behavior

Object-file-to-PostgreSQL keeps its dedicated step contract, Temporal plugin and
small PostgreSQL loading capability. DBT and Spark behavior retain their own
profiles. The PR PostgreSQL lane continues to prove app-role/RLS behavior and
the service-backed object-file vertical without starting the deleted SQL-first
Temporal integration.

## Operational cleanup

The obsolete capacity/recovery proof and its 20-file support tree were removed
because they attempted the retired Preview/Run flow. Local database lifecycle
is now owned by `scripts/run-local-postgres.cjs`; it does not claim runtime
execution evidence.
