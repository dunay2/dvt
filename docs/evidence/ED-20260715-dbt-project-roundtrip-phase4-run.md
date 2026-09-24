---
title: dbt project roundtrip phase four preview and run
status: Accepted
date: 2026-07-15
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/PlanPreviewProvenance.v1.ts
  - apps/api/src/application/services/resolveAuthorizedPreviewSelection.ts
  - apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts
  - apps/api/src/infrastructure/dbt/DbtProjectBundleBuilder.ts
  - apps/api/src/infrastructure/dbt/FileDbtRunExecutionContextWriter.ts
  - apps/web/src/app/views/canvas/dbtProjectFileExecutionStrategy.ts
  - apps/web/src/app/views/canvas/useDbtProjectFileExecution.ts
  - apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - pnpm --filter @dvt/web test
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
    - node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts
    - node --test scripts/planning-db-migrate.test.cjs
    - pnpm docs:feature-mechanization:implementation
    - pnpm verify:prepush
---

# Summary

This evidence records the file-authoritative dbt Preview and Run vertical. A
Canvas selection is projected from the current server analysis, previewed with
revision-bound and secret-free provenance, persisted as an execution plan, and
run through a server-created dbt bundle and Temporal execution context.

# Scope

- Preview derives its planner graph from `ProjectDbtGraphFromFiles`; it does not
  regenerate or mutate workspace project files.
- The protected API re-resolves the project graph and executable selection. A
  stale project revision, analysis revision, target identity, or selected
  resource fails closed.
- Provenance records project root, content SHA-256, analysis SHA-256, dbt
  version, selected unique IDs, provider, adapter, target name, and credential
  reference identity without credential values.
- StartRun builds the runtime bundle from the same allowed source snapshot and
  revision, excludes `profiles.yml` and generated or secret-bearing surfaces,
  and persists one immutable server-created execution context.
- RT-006 exercises the real browser, protected API, PostgreSQL, dbt CLI,
  persisted plan, Temporal worker, run events, and reloaded run provenance. It
  uses no `/workspace/graph/draft` intercept, direct draft seed, or fake success
  path.

# Authority

The requirements remain in ADR-0060, the mandatory dbt project roundtrip plan,
and Planning DB design `DBT-PROJECT-FILE-EXECUTION-PHASE4-20260715`. Product
intent reuses `ProjectDbtGraphFromFiles`, `BuildDbtPlannerGraphSource`,
`PreviewExecutionPlan`, `ObservePlanRunReadiness`, and `StartRun`. This file is
ARC validation evidence only.
