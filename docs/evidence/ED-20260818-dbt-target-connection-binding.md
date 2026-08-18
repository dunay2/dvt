---
title: Explicit governed connection binding for dbt execution targets
status: Accepted
date: 2026-08-18
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/PlanPreviewProvenance.v1.ts
  - apps/api/src/application/services/projectDbtGraphFromFilesUseCase.ts
  - apps/api/src/application/services/RunExecutionContextBindingUseCase.ts
  - apps/api/src/infrastructure/dbt/ConfiguredDbtExecutionConnectionBindingVerifier.ts
  - apps/web/src/app/components/dbtExecutionTargetBinding.ts
  - apps/web/src/app/views/canvas/dbtExecutionTargetWorkbenchContribution.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/plan-preview-provenance.contract.test.ts test/dbt-project-file-projection.contract.test.ts
    - pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/projectDbtGraphFromFilesUseCase.test.ts test/application/services/dbtPlanExecutionBinding.test.ts test/application/services/RunExecutionContextBindingUseCase.test.ts test/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.test.ts test/infrastructure/dbt/ConfiguredDbtExecutionConnectionBindingVerifier.test.ts
    - pnpm --filter @dvt/web exec vitest run --config vitest.canvas.config.ts src/app/views/canvas/dbtExecutionTargetWorkbenchContribution.test.tsx src/app/views/canvas/canvasPlanReadiness.test.ts src/app/views/canvas/dbtProjectFileExecutionStrategy.test.ts
    - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/PlanPreviewModal.test.tsx
    - node --test scripts/run-selected-closure-live-proof.test.cjs
    - pnpm --filter @dvt/web test:e2e:selected-closure:live -- --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts
    - pnpm docs:feature-mechanization:implementation
    - pnpm verify:prepush
---

Issue #2257 extends the existing file-backed dbt graph projection with one
server-owned execution target identity. The strict provenance contract carries
the runtime provider, dbt adapter and target, a governed `ConnectionRef`, the
explicit default-resolution source, and an opaque credential reference. The
connection provider must match the dbt adapter. Credential values remain
outside the projection and execution plan.

The project graph query resolves the configured connection against the
authorized workspace catalog before declaring Preview or Run ready. It also
resolves the effective dbt profile and verifies that every concrete output with
the selected target name identifies the same host, port, user, and database as
the governed catalog credential. Missing, ambiguous, templated, or divergent
profiles fail closed. Run repeats both checks and rejects drift before creating
the dbt bundle or dispatching execution. It also compares the persisted Preview
target with the current server target, so configuration drift requires a new
Preview.

Canvas Workbench and Execution Preview use one secret-free read model to show
the effective target, connection identity, and resolution source in English or
Spanish. The current environment-owned binding is intentionally read-only;
there is no UI-only override or fabricated profile manager.

The live proof generates the dbt profile and governed PostgreSQL binding from
the same isolated database URL, verifies the displayed target and connection,
starts the persisted plan through the protected Temporal runtime, and observes
the selected dbt steps complete. No second connection catalog, planner, graph,
state store, provider placeholder, migration, or compatibility branch is added.
