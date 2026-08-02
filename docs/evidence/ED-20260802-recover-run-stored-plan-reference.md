---
title: Recover-run stored plan reference integrity
status: Accepted
date: 2026-08-02
owners:
  - packages/@dvt/artifacts
  - packages/@dvt/adapter-postgres
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/artifacts/src/ports/IStoredPlanArtifactStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts
  - apps/api/src/application/services/recoverRunUseCase.ts
evidence:
  tests:
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

## Evidence

Unit coverage distinguishes the executable artifact SHA from the canonical plan
hash. PostgreSQL integration coverage proves exact-reference recovery and scope
isolation. The live Cypress proof cancels and recovers a real run through the
browser, protected API, PostgreSQL, Temporal, and worker.
