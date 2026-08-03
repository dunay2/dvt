---
title: Recover-run stored plan reference integrity
status: Accepted
date: 2026-08-02
owners:
  - packages/@dvt/artifacts
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts
  - packages/@dvt/engine/src/application/RecoverRunApplicationService.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/engine/src/ports/IRunMaintenanceService.ts
  - packages/@dvt/engine/src/services/runMaintenance/PendingIntentReconciliationPolicy.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts
  - apps/api/src/application/services/recoverRunUseCase.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/adapter-postgres test
    - DVT_PG_INTEGRATION=1 pnpm --filter @dvt/adapter-postgres exec vitest run test/smoke.test.ts --config vitest.config.ts
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api exec vitest run test/application/services/recoverRunUseCase.test.ts --config vitest.config.ts
    - DVT_PG_INTEGRATION=1 pnpm --filter @dvt/adapter-postgres exec vitest run test/PostgresPlanStore.records-core.integration.test.ts --config vitest.config.ts
    - node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/runs/run-controls-live.cy.ts
---

## Decision

`RecoverRun` resolves the exact persisted `PlanRef` through the artifact query
port. It never derives the executable artifact SHA from `PlanRecord.canonicalHash`.

The PostgreSQL adapter checks the tenant, project, and environment plan record
before exposing the tenant-neutral stored artifact reference. The engine's plan
integrity validation remains fail closed.

Recovery preparation reserves retry lineage and bootstraps the child through
one state-store transaction. A failure rolls back the reservation; a later
retry with the same recovery identity resumes the prepared child instead of
creating another logical attempt. The engine revalidates the full child
identity and admission posture before provider dispatch.

Before a prepared recovery is dispatched again, the API invokes the scoped
form of the canonical orphan-intent reconciliation rail. A provider workflow
found for bootstrapped run state is adopted by reconciling its provider
reference and resolving the intent. A confirmed missing workflow permits the
prepared child to continue; unsupported or failed provider lookup remains
fail closed.

## Evidence

Unit coverage distinguishes the executable artifact SHA from the canonical plan
hash. PostgreSQL integration coverage proves exact-reference recovery and scope
isolation. Engine and real PostgreSQL coverage prove atomic recovery bootstrap,
rollback, stable lineage, and prepared-child resumption. The live Cypress proof
cancels and recovers a real run through the browser, protected API, PostgreSQL,
Temporal, and worker.
