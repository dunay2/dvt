---
title: Graph Draft DBT model compilation before Preview
status: Accepted
date: 2026-08-19
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/dbt-project/GraphDbtModelCompilation.v1.ts
  - apps/api/src/application/services/compileGraphDbtModelsQuery.ts
  - apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts
  - apps/web/src/app/views/canvas/canvasPlanAction.ts
evidence:
  tests:
    - pnpm exec vitest run test/graph-dbt-model-compilation.contract.test.ts
    - pnpm exec vitest run test/application/compileGraphDbtModelsQuery.test.ts test/infrastructure/dbt/DbtCliProjectAnalyzer.test.ts test/entrypoints/http/graphDbtModelCompilationRoutes.test.ts
    - pnpm exec vitest run src/app/services/dbtProject/graphDbtModelCompilation.api.test.ts src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts src/app/views/canvas/canvasPlanAction.dbtProjectFiles.test.ts src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts src/app/views/canvas/useCanvasExecutionActions.dbtPreviewRun.test.tsx src/app/views/canvas/useCanvasExecutionActions.dbtDraftFlush.test.tsx src/app/views/canvas/canvasExecutionCopy.test.ts
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/web typecheck
    - pnpm verify:prepush
---

## Decision

Graph Draft remains the only authoring authority for Canvas-authored DBT models.
After its deterministic artifacts are published, the existing server-owned DBT
analyzer invokes native `dbt compile --select` for those model selectors. Canvas
creates the existing persisted Preview only when compilation returns SQL for
every selected model.

The compilation result is an ephemeral readiness read model. It is not written
to the graph, workspace files, a store, a planner, or another intermediate
representation. File-backed DBT project execution keeps its existing authority
and does not call this Graph Draft query.

## Evidence

Contract tests bound and validate selectors and fail closed on mixed or
file-backed authority. API tests prove the existing snapshot, sanitized process
environment, timeout, output limit, and process runner are reused for native
compile. Web tests prove the strict order `publish -> compile -> Preview` and
prove invalid compilation blocks Preview with localized product copy rather
than backend diagnostics.
