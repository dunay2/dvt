---
title: TF-A2-C3 C4 API and web adoption closeout
status: Done
owner: api
last_reviewed: 2026-04-23
planning_type: closeout
---

# TF-A2-C3 C4 API and web adoption closeout

## Think-First Analysis

- Problem summary:
  `TF-A2-C1` and `TF-A2-C2` had already frozen the contract and planner
  derivation seams, but preview and planner-backed start-run could still drift
  back to whole-draft compile assumptions, and Canvas still needed one local
  seam for canonical execution selection.
- Root cause:
  The branch had the right planner boundary, but downstream adoption still sat
  in a partially converged state: API owned selected execution only
  implicitly through route/use-case behavior, and web had the correct code
  path without a dedicated local component guide or semantic guard for the
  shared preview/run selection seam.
- Constraints and invariants:
  - Hard cut only: no compatibility shims, no dual DTO families.
  - Protected draft truth remains `WorkspaceGraphAuthoringDraft`.
  - Planner keeps closure derivation ownership.
  - API and web must not widen selected execution to whole-draft compile.
- Selected option and rationale:
  Introduce one API-local executable-subgraph resolver component, keep planner
  derivation owner-local, and document/guard the one web-local Canvas
  execution-selection seam used by preview and run.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  `apps/api/src/application/services/**`,
  `apps/api/docs/**`,
  `apps/web/src/app/views/canvas/**`,
  `docs/architecture/components/**`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/evidence/**`,
  `docs/risk-register/quality/**`,
  and `docs/planning/closeouts/**`
- Expected outcome:
  API preview/start-run and web Canvas preview/run all depend on canonical
  execution selection plus planner-owned selected-closure truth, with local
  guides and semantic architecture tests guarding the seam
- Validation plan:
  `pnpm --filter dvt-api typecheck`,
  `pnpm --filter dvt-api test`,
  `pnpm --filter @dvt/web typecheck`,
  `pnpm --filter @dvt/web test`,
  `pnpm docs:sync`,
  `pnpm docs:workboard:generate`,
  `pnpm docs:status:generate`,
  `pnpm docs:gov:manifest`,
  `pnpm verify:prepush`

## Real Work Performed

- Added API selected-closure resolution code and tests:
  - `apps/api/src/application/services/resolveAuthorizedExecutableSubgraph.ts`
  - `apps/api/test/application/services/resolveAuthorizedExecutableSubgraph.test.ts`
  - `apps/api/test/application/services/executableSubgraphResolutionComponent.architecture.test.ts`
- Hardened API callers:
  - `apps/api/src/application/services/PreviewPlanUseCase.ts`
  - `apps/api/src/application/services/PlannerBackedStartRunUseCase.ts`
  - `apps/api/src/modules/startRun/buildProtectedStartRunRuntime.ts`
  - `apps/api/src/app.ts`
- Added API local guide:
  `apps/api/docs/executable-subgraph-resolution-component.md`
- Added web local guide and semantic guard:
  - `docs/architecture/components/web/graph/canvas-execution-selection-component.md`
  - `apps/web/src/app/views/canvas/canvasExecutionSelection.architecture.test.ts`
- Updated planner/API/web docs and traceability:
  - `docs/contracts/planner/execution-selection-and-executable-subgraph-v1.md`
  - `docs/architecture/components/planner/execution-selection-component.md`
  - `docs/architecture/components/api/index.md`
  - `docs/architecture/components/api/protected-runtime-and-plan-compile-component.md`
  - `docs/architecture/components/web/graph/index.md`
  - `docs/planning/status/canonical-doc-code-matrix.md`
  - `docs/planning/state/agent-lane-a.yaml`
- Closed the adoption risk and added route-completion evidence.

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/reference-architecture.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/tf-a2-c-execution-selection-and-executable-subgraph-plan-20260423.md`
- `docs/contracts/planner/execution-selection-and-executable-subgraph-v1.md`
- `docs/architecture/components/planner/execution-selection-component.md`
- `docs/architecture/components/web/runs/start-run-client-identity-boundary.md`
- `.arc-policy.yaml`

## Validation Evidence

- Passed:
  `pnpm --filter dvt-api test -- resolveAuthorizedExecutableSubgraph.test.ts executableSubgraphResolutionComponent.architecture.test.ts PlannerBackedStartRunUseCase.test.ts previewPlanRoute.inputPolicy.test.ts previewPlanRoute.outcomes.test.ts startRunRoute.validation.test.ts startRunRoute.authAndSuccess.test.ts startRunRoute.planSourcePolicy.test.ts startRunRouteCommandBuilder.test.ts app.test.ts`
- Passed:
  `pnpm --filter dvt-api typecheck`
- Passed:
  `pnpm --filter dvt-api test`
- Passed:
  `pnpm --filter @dvt/web test -- canvasExecutionSelection.architecture.test.ts canvasRunStartIdentity.architecture.test.ts useCanvasExecutionActions.planPreview.core.test.tsx useCanvasExecutionActions.runStart.test.tsx plansService.test.ts runsService.test.ts`
- Passed:
  `pnpm --filter @dvt/web typecheck`
- Passed:
  `pnpm --filter @dvt/web test`
- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm docs:workboard:generate`
- Passed:
  `pnpm docs:status:generate`
- Passed:
  `pnpm docs:gov:manifest`
- Passed:
  `pnpm verify:prepush`

## No-Debt Evidence

- No compatibility shim or dual DTO line was introduced.
- No rules were relaxed or disabled.
- No hooks were bypassed.
- No hidden whole-draft fallback path was introduced.

## No-Stub Evidence

- `ResolveAuthorizedExecutableSubgraphService` reads the real protected draft
  store and calls the real planner derivation seam.
- Preview and planner-backed start-run now consume real resolver output before
  planner build.
- Canvas preview and run both emit real canonical `ExecutionSelection` values
  through the shared browser-local seam.
