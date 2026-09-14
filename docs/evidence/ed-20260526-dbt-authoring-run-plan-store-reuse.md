---
title: DBT authoring run vertical and plan-store replay reuse
status: Accepted
date: 2026-05-26
owners:
  - '@dvt/web'
  - dvt-api
  - '@dvt/adapter-postgres'
arc_level: ARC-2
breaking: false
code_refs:
  - apps/web/src/app/views/canvas/canvasPlanAction.ts
  - apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts
  - apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.mappers.ts
evidence:
  tests:
    - pnpm --filter '@dvt/web' exec vitest run src/app/views/canvas/canvasDbtAuthoringModel.test.ts src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts src/app/views/canvas/canvasDbtPlannerGraphSource.test.ts src/app/views/canvas/useCanvasExecutionActions.dbt.test.tsx src/app/views/canvas/canvasRuntimePolicy.test.ts src/app/views/canvas/canvasDraftAccessPostureModel.test.ts
    - pnpm --filter '@dvt/web' exec cypress run --config-file cypress.config.ts --spec cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts --browser electron
    - pnpm --filter dvt-api exec vitest run test/application/services/DbtRunExecutionContextBindingUseCase.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts test/application/services/resolveAuthorizedExecutableSubgraph.test.ts test/application/services/startRunApplicationComponent.architecture.test.ts
    - pnpm --filter '@dvt/adapter-postgres' exec vitest run test/PostgresPlanStore.invariants.unit.test.ts
    - DVT_PG_INTEGRATION=1 DATABASE_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter '@dvt/adapter-postgres' exec vitest run test/PostgresPlanStore.lifecycle.integration.test.ts
---

# DBT Authoring Run Vertical And Plan-Store Replay Reuse

This evidence covers the DBT Canvas authoring path that lets a user configure
DBT cards, select a source origin, generate workspace DBT project files, preview
a persisted plan, and start a run through the protected runtime.

It also covers the plan-store replay correction required by the live flow:
repeated deterministic previews may reuse the same plan identity while volatile
creation metadata differs. The Postgres adapter now treats already valid plan
artifacts as reusable when the stable canonical payload matches.

## Rejected Preview replay regression — 2026-09-14, GH-3165

PCV1 verification on `main@1073801b5a7fbf24b7aaeb8789eab72e8f425ad2`
found that repeating the protected three-source Preview returned HTTP 500.
The PostgreSQL lifecycle test and the one/two/three-input API integrations
reproduced `PLAN_VALIDATION_STATE_REUSE_UNSUPPORTED` on the second request.

The fix removes the `INVALID`-specific storage exception in
`PostgresPlanStore.storePlanArtifact`. The existing identity/collision checks,
scoped plan record, immutable artifact, admission coordinator and rejected HTTP
response are reused. ADR-0043 clarifies the distinction: storing identical bytes
does not change validation or admit execution. No schema, port or route is added.

The real browser now opens the persisted `plan-invalid` response (HTTP 422), with
`MISSING_CAPABILITY: executor.dvt-postgres-operational-workload` and Run disabled.
This is regression evidence for Preview, not completion of PCV1/#2599 or native
SQL execution; #3115/#2723 retain the runtime work.

Focused verification uses real PostgreSQL, with `DVT_PG_URL` pointing at the local
test service and `DVT_PG_INTEGRATION=1` for adapter integration tests:

- `pnpm --filter @dvt/adapter-postgres exec vitest run --config vitest.config.ts test/PostgresPlanStore.lifecycle.integration.test.ts test/PostgresPlanStore.records-core.integration.test.ts test/PostgresPlanStore.records-guards.integration.test.ts test/PostgresPlanStore.invariants.unit.test.ts`
- `pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/dvtProtectedPreview.integration.test.ts`
- `pnpm --filter dvt-api exec vitest run test/application/services/StoredPlanAdmissionCoordinator.test.ts test/application/services/PreviewPlanUseCase.outcomes.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts`

The issue records candidate SHA, browser reload/replay, final lint/type checks,
ARC validation and `pnpm verify:prepush` results. Existing valid/pending replay,
conflict, scope, archived/superseded and invalid-materialization guards remain
required. No hooks or validation policies are relaxed.
