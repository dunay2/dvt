---
title: TF-E2-K-A first-canvas playground host closeout
status: Done
owner: web
last_reviewed: 2026-04-23
planning_type: closeout
---

# TF-E2-K-A first-canvas playground host closeout

## Think-First Analysis

- Problem summary:
  `TF-E2-E` browser-proof work was blocked by a missing host surface above the
  Canvas route. The product still behaved as if one implicit canvas existed by
  default, so there was no honest user-visible flow for `create canvas ->
choose kind -> typed empty canvas`.
- Root cause:
  The route had correct graph and draft mechanics but no persisted canvas
  document identity. That left the host model implicit and forced tests and
  empty-state semantics to treat transformation authoring as the default
  transport path.
- Constraints and invariants:
  - `AGENTS.md` requires docs-first execution, validation evidence, and no
    hidden debt.
  - `docs/guides/ai-work-protocol.md` requires think-first analysis and
    pre-implementation clarity before architectural changes.
  - `workspace-first` remains the canonical host model in this repository.
  - This slice is a hard cut: no compatibility path and no hidden fallback to
    a synthetic default canvas.
  - The backend still persists one workspace draft record, so the host must
    not overclaim multi-canvas persistence yet.
  - Empty authoring must remain productive only after the host creates a typed
    canvas document.
- Options considered:
  1. Keep the old implicit transformation canvas and add more empty-state
     affordances.
     Rejected: preserves the model conflation that blocked browser proof.
  2. Fake multi-canvas tabs before the persisted draft boundary can carry that
     truth.
     Rejected: would introduce host debt and semantic drift.
  3. Persist one explicit `canvas` document on the canonical workspace draft,
     add a host-owned `needs_canvas` posture, and route empty authoring through
     the selected canvas kind.
     Selected: closes the missing prerequisite without inventing backend truth.
- Selected option and rationale:
  Introduce a host-owned first-canvas creation posture, require `canvas` on
  `WorkspaceGraphAuthoringDraft`, and derive typed empty-canvas authoring from
  `canvasDocument.kind`.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  `packages/@dvt/contracts/**`,
  `apps/web/src/app/views/canvas/**`,
  `apps/web/src/app/plugins/**`,
  `apps/web/src/app/services/workspace/**`,
  `docs/architecture/components/web/graph/**`,
  `docs/planning/state/agent-lane-e.yaml`,
  `docs/planning/status/generated-code-state.md`,
  and `docs/.manifest.json`
- Expected outcome:
  the Canvas route shows a host-owned `needs_canvas` posture, persists the
  first canvas kind through the canonical draft contract, and then renders a
  typed empty canvas for `dbt` or `transformation`
- Risks and mitigations:
  - Risk: controller and harness tests drift because registry mocks do not
    model the new canvas-kind surface.
    Mitigation: extend the central controller harness instead of patching
    individual tests.
  - Risk: empty authoring docs and architecture tests keep describing a
    hardcoded transformation catalog.
    Mitigation: update the local component guide and semantic architecture
    tests in the same slice.
  - Risk: host posture silently falls back to a fake canvas document.
    Mitigation: make `canvas` required in the contract and fail closed when it
    is missing.
- Out-of-scope items:
  multi-canvas restoration, host-owned tab registry, and first-node UX beyond
  the existing typed empty authoring entrypoint
- Validation plan:
  `pnpm --filter @dvt/contracts test -- workspace-graph-authoring-draft.contract.test.ts validation.test.ts`,
  `pnpm --filter @dvt/contracts build`,
  `pnpm --filter @dvt/web test`,
  `pnpm --filter @dvt/web typecheck`,
  `pnpm docs:sync`,
  `pnpm docs:workboard:generate`,
  `pnpm docs:gov:manifest`,
  `pnpm verify:prepush`
- Test coverage plan:
  cover missing-canvas contract rejection, route `needs_canvas` posture, typed
  empty-canvas authoring semantics, repository conflict hydration, and central
  controller harness registry behavior
- Libraries evaluated:
  None. The slice extends the existing draft, plugin registry, and route
  composition seams.

## Real Work Performed

- Added required canvas document identity to the canonical contract:
  - `packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts`
  - `packages/@dvt/contracts/src/index.ts`
  - `packages/@dvt/contracts/test/workspace-graph-authoring-draft.contract.test.ts`
  - `packages/@dvt/contracts/test/validation/workspace-graph-draft.ts`
- Adopted the new contract in web draft projection and persistence seams:
  - `apps/web/src/app/ports/workspace.ts`
  - `apps/web/src/app/services/workspace/workspaceGraphDraftProjection.ts`
  - `apps/web/src/app/views/canvas/canvasDraftAuthoring.ts`
  - `apps/web/src/app/views/canvas/canvasDraftLifecycleSnapshot.ts`
  - `apps/web/src/app/views/canvas/useCanvasCurrentDraftPayload.ts`
  - `apps/web/src/app/views/canvas/useCanvasDraftLifecycle.ts`
- Added the host-owned create-first-canvas surface:
  - `apps/web/src/app/views/canvas/CanvasPlaygroundHost.tsx`
  - `apps/web/src/app/views/canvas/canvasWorkbenchStateModel.ts`
  - `apps/web/src/app/views/canvas/canvasCenterSurfaceWorkbench.tsx`
  - `apps/web/src/app/views/canvas/canvasControllerViewModel.ts`
  - `apps/web/src/app/views/canvas/canvasCenterSurface.types.ts`
  - `apps/web/src/app/views/canvas/CanvasCenterSurface.tsx`
- Added plugin-owned canvas kind registration and routed typed empty authoring
  through it:
  - `apps/web/src/app/plugins/nodeTypeContracts.ts`
  - `apps/web/src/app/plugins/registry.ts`
  - `apps/web/src/app/plugins/dbt/dbtContributions.ts`
  - `apps/web/src/app/plugins/dvt/dvtContributions.ts`
- Reworked the controller test defaults from broad `Pick<>` transport bags to
  DTO-style local seams and updated the central harness mocks:
  - `apps/web/src/app/views/Canvas.test.controller.defaults.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.test.harness.tsx`
  - `apps/web/src/app/views/canvas/useCanvasController.test.projectionMocks.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.test.types.ts`
- Updated the local architecture pack and planning surfaces:
  - `docs/architecture/components/web/graph/canvas-playground-host-component.md`
  - `docs/architecture/components/web/graph/canvas-empty-authoring-entrypoint-component.md`
  - `docs/architecture/components/web/graph/canvas-component-map-and-modernization-review.md`
  - `docs/architecture/components/web/graph/index.md`
  - `docs/planning/state/agent-lane-e.yaml`
  - `docs/planning/status/generated-code-state.md`
  - `docs/.manifest.json`

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/agent-lane-e.yaml`
- `docs/architecture/reference-architecture.md`
- `docs/planning/proposals/workspace-first-frontend-architecture-specification.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-target-architecture-execution-plan-20260417.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-canvas-empty-authoring-entrypoint-design-20260422.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-project-playground-and-multi-canvas-host-plan-20260423.md`

## Validation Evidence

- Passed:
  `pnpm --filter @dvt/contracts test -- workspace-graph-authoring-draft.contract.test.ts validation.test.ts`
- Passed:
  `pnpm --filter @dvt/contracts build`
- Passed:
  `pnpm --filter @dvt/web test -- src/app/views/canvas/canvasDraftRepository.readWrite.test.ts src/app/views/canvas/canvasDraftRepository.conflict.test.ts src/app/views/canvas/canvasWorkbenchStateModel.test.ts src/app/views/canvas/canvasDraftPresentationModel.test.ts src/app/views/canvas/canvasRouteInteractionState.test.ts src/app/views/Canvas.routeStates.test.tsx src/app/views/canvas/CanvasCenterSurface.architecture.test.ts src/app/views/canvas/CanvasEmptyAuthoringEntrypoint.architecture.test.ts`
- Passed:
  `pnpm --filter @dvt/web test`
- Passed:
  `pnpm --filter @dvt/web typecheck`
- Passed:
  `pnpm docs:status:generate`
- Passed:
  `pnpm docs:sync`
- Passed:
  `pnpm docs:workboard:generate`
- Passed:
  `pnpm docs:gov:manifest`
- Passed:
  `pnpm verify:prepush`
  Note: after the final commit, `verify:prepush` selected
  `pnpm ci:affected:typecheck` and passed against `dvt-api`, `@dvt/web`, and
  `@dvt/contracts`.

## No-Debt Evidence

- No compatibility shim or fake default canvas was introduced.
- No rules, hooks, or checks were relaxed.
- Multi-canvas restoration remains explicitly out of scope instead of being
  implied through local-only state.

## No-Stub Evidence

- `CanvasPlaygroundHost` is a real routed surface wired through the existing
  controller and draft repository seams.
- `WorkspaceGraphAuthoringDraft` now rejects missing canvas identity instead of
  treating it as an optional placeholder.
- The typed empty-canvas posture resolves real plugin-owned node catalogs
  rather than a temporary hardcoded host list.
