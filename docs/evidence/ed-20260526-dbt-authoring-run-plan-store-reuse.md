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
