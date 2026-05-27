---
title: E-DBT-AUTHOR-RUN-1 Closeout
status: Review
date: 2026-05-26
task_id: E-DBT-AUTHOR-RUN-1
owners:
  - apps/web
  - apps/api
  - packages/@dvt/adapter-postgres
---

# E-DBT-AUTHOR-RUN-1 Closeout

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dbt-authoring-code-run-vertical-plan-20260526.md`
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/architecture/components/api/protected-runtime-and-plan-compile-component.md`

## User Outcome

The demanding-user target was exercised against the live protected runtime:

- configure dbt source and model cards from the Canvas Inspector;
- select the model origin from the authored dbt graph;
- generate dbt workspace files and inspect `payments_model.sql` in Code;
- start execution from the persisted plan reference.

## Real Work Performed

- Added route-owned dbt authoring metadata, source selection, dbt workspace
  artifact generation, and generic planner graph-source projection in
  `apps/web/src/app/views/canvas/**`.
- Routed graph plan eligibility through the Canvas execution state and shell
  toolbar so DBT Plan is unavailable on an empty/non-planifiable graph while
  first-node DBT authoring remains available.
- Extracted the pre-execution draft flush into
  `apps/web/src/app/views/canvas/useCanvasExecutionDraftFlush.ts` so Plan/Run
  save-before-execute behavior remains a narrow execution command seam instead
  of hidden lifecycle orchestration.
- Moved the DBT Inspector select and section visual classes into
  `graphVisualClasses` so the card authoring UI stays within the graph token
  component contract.
- Wired dbt Canvas execution to the existing `PreviewExecutablePlan`,
  `SaveWorkspaceFileContent`, `ListWorkspaceFiles`, `GetWorkspaceFileContent`,
  and `StartRun` rails instead of plugin-local mock state.
- Added API binding for persisted dbt `PlanRef` execution context creation in
  `apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts`.
- Hardened plan-store reuse for deterministic dbt preview replay in
  `packages/@dvt/adapter-postgres/**`.
- Added ARC-2 evidence and risk entries for adapter changes:
  `docs/evidence/ed-20260526-dbt-authoring-run-plan-store-reuse.md` and
  `docs/risk-register/quality/R-20260526-DBT-PLAN-STORE-REUSE.yaml`.
- Added live Cypress coverage:
  `apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts`.

## Validation Evidence

- `pnpm docs:status:generate` - PASS.
- `pnpm docs:sync` - PASS.
- `pnpm docs:feature-mechanization -- --feature E-DBT-AUTHOR-RUN-20260526` -
  PASS.
- `pnpm docs:feature-mechanization:implementation` - PASS.
- `pnpm --filter '@dvt/web' exec vitest run src/app/views/canvas/canvasDbtAuthoringModel.test.ts src/app/views/canvas/canvasDbtWorkspaceArtifacts.test.ts src/app/views/canvas/canvasDbtPlannerGraphSource.test.ts src/app/views/canvas/useCanvasExecutionActions.dbt.test.tsx src/app/views/canvas/canvasRuntimePolicy.test.ts src/app/views/canvas/canvasDraftAccessPostureModel.test.ts` -
  PASS, 6 files and 24 tests.
- `pnpm --filter '@dvt/web' typecheck` - PASS.
- `pnpm --filter '@dvt/web' lint` - PASS.
- `pnpm --filter '@dvt/web' exec vitest run src/app/views/Canvas.routeStates.first-canvas-policy.test.tsx` -
  PASS, 7 tests.
- `pnpm --filter '@dvt/web' exec vitest run src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/canvas/canvasToolbarViewModel.test.ts src/app/views/canvas/useCanvasExecutionActions.dbt.test.tsx src/app/views/canvas/canvasRuntimePolicy.test.ts` -
  PASS, 4 files and 20 tests.
- `pnpm --filter '@dvt/web' exec vitest run src/app/plugins/graphStrategyRegistry.test.ts` -
  PASS, 9 tests.
- `pnpm --filter '@dvt/web' exec vitest run src/app/views/canvas/canvasDraftAuthoringComponent.architecture.test.ts src/app/views/canvas/canvasProjectSnapshot.architecture.test.ts src/app/views/canvas/useCanvasDraftLifecycle.architecture.test.ts src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts src/app/views/canvas/useCanvasExecutionActions.dbt.test.tsx` -
  PASS, 5 files and 13 tests.
- `pnpm --filter dvt-api typecheck` - PASS.
- `pnpm --filter dvt-api lint` - PASS.
- `pnpm --filter dvt-api exec vitest run test/application/services/DbtRunExecutionContextBindingUseCase.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts test/application/services/resolveAuthorizedExecutableSubgraph.test.ts test/application/services/startRunApplicationComponent.architecture.test.ts` -
  PASS, 4 files and 20 tests.
- `pnpm --filter '@dvt/adapter-postgres' typecheck` - PASS.
- `pnpm --filter '@dvt/adapter-postgres' exec vitest run test/PostgresPlanStore.invariants.unit.test.ts` -
  PASS, 7 tests.
- `$env:DVT_PG_INTEGRATION='1'; $env:DATABASE_URL='postgresql://dvt:dvt@localhost:5432/dvt'; pnpm --filter '@dvt/adapter-postgres' exec vitest run test/PostgresPlanStore.lifecycle.integration.test.ts` -
  PASS, 8 tests.
- `pnpm --filter '@dvt/adapter-postgres' lint` - package has no `lint`
  script; not counted as lint coverage.
- `node --test scripts/run-dev-stack.test.cjs scripts/run-dev-stack.auth.test.cjs scripts/verify-prepush.test.cjs tools/ci/turbo-workspace-task-contract.test.mjs` -
  PASS, 46 tests.
- Live Cypress proof against `http://127.0.0.1:5173/canvas` and
  `http://127.0.0.1:3000`: `pnpm --filter '@dvt/web' exec cypress run --config-file cypress.config.ts --spec cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts --browser electron` -
  PASS, 1 test.

Final repository gates after this closeout file is indexed:

- `pnpm docs:sync` - PASS.
- `pnpm governance:refresh` - PASS.
- `pnpm verify:prepush` - PASS.

## No-Debt Evidence

- No hooks were bypassed.
- No lint, type, test, or quality rules were relaxed.
- No mock execution path was presented as product behavior.
- `.dvt/` was added to `.gitignore` because it is local dev-stack output, not
  repository source.
- Remaining declared residuals are unchanged from the plan: live database
  catalog import and node-level dbt execution history remain out of scope.

## No-Stub Evidence

No stub, placeholder, fake adapter, or TODO/FIXME marker was added. The user
flow uses the live protected-runtime API, persisted workspace files, persisted
plan references, and run snapshot/event reads.
