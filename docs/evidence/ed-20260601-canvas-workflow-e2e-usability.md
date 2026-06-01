---
title: Canvas workflow E2E usability restoration
status: Accepted
date: 2026-06-01
owners:
  - Web
  - API
  - '@dvt/adapter-postgres'
  - '@dvt/adapter-temporal'
  - dvt-temporal-worker
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/application/services/resolveAuthorizedExecutableSubgraph.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.sql.ts
  - packages/@dvt/adapter-temporal/src/activities/stepActivityValidation.ts
  - apps/temporal-worker/src/runtime/temporalWorkerPostgresProfile.ts
  - apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts
evidence:
  tests:
    - pnpm --filter dvt-api test -- test/application/services/resolveAuthorizedExecutableSubgraph.test.ts
    - DVT_PG_INTEGRATION=1 DVT_PG_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm --filter @dvt/adapter-postgres test -- PostgresPlanStore.lifecycle.integration.test.ts PostgresPlanStore.records-core.integration.test.ts
    - pnpm --filter @dvt/adapter-temporal test -- test/activities.test.ts
    - pnpm --filter dvt-temporal-worker test -- test/runtime/createTemporalWorkerRuntime.test.ts
    - pnpm --filter @dvt/web test -- src/app/views/canvas/transformationGraphValidation.test.ts src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx src/app/views/runs/RunStates.test.tsx
    - node --test scripts/run-dev-stack.test.cjs scripts/run-dev-stack.auth.test.cjs
    - pnpm --dir apps/web exec cypress run --config-file cypress.config.ts --config baseUrl=http://127.0.0.1:5173 --spec cypress/e2e/canvas/canvas-preview-run-live.cy.ts --browser electron
---

# Canvas Workflow E2E Usability Restoration

This evidence record covers the no-bypass Canvas workflow restoration on the
local protected runtime stack. The verified path creates a SQL-first workflow
from Canvas, persists generated SQL and graph artifacts through workspace file
rails, previews the executable plan, starts a Temporal-backed run, waits for a
completed run snapshot, verifies Postgres materialization evidence, and imports
seeded warehouse metadata through DataObject Registry.

The slice also covers the root-cause fixes required to make that path real:
consistent executable-subgraph projection, pre-alpha plan-store hard-cut cleanup,
createdAt-only plan replay idempotency, tenant queue alignment, SQL-first worker
activity wiring, canonical `retryPolicy` validation, local proof source seeding,
source-import authorization, and completed-run evidence visibility.
