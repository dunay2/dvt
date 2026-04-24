---
title: TF-E2-K-C typed empty-canvas posture closeout
status: Done
owner: web
last_reviewed: 2026-04-23
planning_type: closeout
---

# TF-E2-K-C typed empty-canvas posture closeout

## Think-First Analysis

- Problem summary:
  After `TF-E2-K-B`, the host correctly exposed an authoritative draft-backed
  tab, but once a canvas existed the empty authoring posture still reused one
  generic route copy. Only the node catalog changed.
- Root cause:
  `CanvasKindRegistration` carried typed node kinds but not typed empty-state
  copy. The host therefore owned wording that should have stayed with the
  canvas kind.
- Constraints and invariants:
  - plugin-owned kinds own typed authoring semantics
  - host-owned route copy may still own blocked, loading, and read-only
    posture
  - editable empty-state copy must not drift away from the active canvas kind
  - no runtime or planner behavior changes in this slice
- Options considered:
  1. Keep one global empty-state copy and rely on node buttons only.
     Rejected: weak host truth and easy drift.
  2. Add ad hoc empty-copy maps in the workbench renderer.
     Rejected: second registry outside plugin contributions.
  3. Extend `CanvasKindRegistration` with typed empty-state copy and route it
     through the existing empty-state renderer.
     Selected: correct ownership and low surface area.
- Selected option and rationale:
  Extend the canvas-kind registry contract with `emptyState`, wire it through
  `canvasCenterSurfaceWorkbench.tsx`, and prove the distinct `dbt` vs
  `transformation` posture in route tests.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  `apps/web/src/app/plugins/**`,
  `apps/web/src/app/views/canvas/**`,
  `docs/architecture/components/web/graph/**`,
  `docs/planning/state/agent-lane-e.yaml`,
  `docs/planning/closeouts/**`,
  `docs/planning/status/generated-code-state.md`,
  and `docs/.manifest.json`
- Expected outcome:
  typed empty-canvas title, editable message, and first-node copy come from
  the active canvas kind, while read-only and runtime-gated postures remain
  host-owned
- Risks and mitigations:
  - Risk: contribution mocks and test defaults drift from the new registry
    contract
    Mitigation: update the central defaults and registry mocks in the same
    slice
  - Risk: the host doc keeps claiming only node kinds are plugin-owned
    Mitigation: update the local architecture guide and fitness function
  - Risk: read-only or import-unavailable states lose clear operator guidance
    Mitigation: keep those messages host-owned and only specialize editable
    typed posture
- Out-of-scope items:
  browser proof, selected-closure UX, runtime execution changes, and
  multi-canvas persistence
- Validation plan:
  `pnpm --filter @dvt/web typecheck`,
  `pnpm --filter @dvt/web test -- src/app/views/Canvas.routeStates.test.tsx src/app/views/canvas/CanvasEmptyAuthoringEntrypoint.architecture.test.ts src/app/views/canvas/CanvasCenterSurface.architecture.test.ts src/app/views/canvas/canvasPlaygroundTabState.test.ts`,
  `pnpm --filter @dvt/web test`,
  `pnpm docs:status:generate`,
  `pnpm docs:sync`,
  `pnpm docs:workboard:generate`,
  `pnpm docs:gov:manifest`,
  `pnpm verify:prepush`

## Real Work Performed

- Extended the plugin-owned canvas-kind contract with typed empty-state copy:
  - `apps/web/src/app/plugins/nodeTypeContracts.ts`
  - `apps/web/src/app/plugins/dbt/dbtContributions.ts`
  - `apps/web/src/app/plugins/dvt/dvtContributions.ts`
- Routed typed empty-state copy through the workbench renderer:
  - `apps/web/src/app/views/canvas/CanvasStateViews.tsx`
  - `apps/web/src/app/views/canvas/canvasCenterSurfaceWorkbench.tsx`
- Updated controller/test defaults and route proof:
  - `apps/web/src/app/views/Canvas.routeStates.test.tsx`
  - `apps/web/src/app/views/Canvas.test.controller.defaults.ts`
  - `apps/web/src/app/views/canvas/useCanvasController.test.projectionMocks.ts`
  - `apps/web/src/app/views/canvas/canvasPlaygroundTabState.test.ts`
  - `apps/web/src/app/views/canvas/CanvasCenterSurface.architecture.test.ts`
- Updated the local component guide and planning surfaces:
  - `docs/architecture/components/web/graph/canvas-empty-authoring-entrypoint-component.md`
  - `docs/planning/state/agent-lane-e.yaml`
  - `docs/planning/closeouts/index.md`

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/guides/testing-and-ci-capabilities.md`
- `docs/planning/state/agent-lane-e.yaml`
- `docs/planning/proposals/mandatory/frontend-and-ux/tf-e2-project-playground-and-multi-canvas-host-plan-20260423.md`
- `docs/architecture/components/web/graph/canvas-empty-authoring-entrypoint-component.md`
- `docs/architecture/components/web/graph/canvas-playground-host-component.md`

## Validation Evidence

- Passed:
  `pnpm --filter @dvt/web typecheck`
- Passed:
  `pnpm --filter @dvt/web test -- src/app/views/Canvas.routeStates.test.tsx src/app/views/canvas/CanvasEmptyAuthoringEntrypoint.architecture.test.ts src/app/views/canvas/CanvasCenterSurface.architecture.test.ts src/app/views/canvas/canvasPlaygroundTabState.test.ts`
- Pending at closeout capture time and executed before commit:
  `pnpm --filter @dvt/web test`,
  `pnpm docs:status:generate`,
  `pnpm docs:sync`,
  `pnpm docs:workboard:generate`,
  `pnpm docs:gov:manifest`,
  `pnpm verify:prepush`

## No-Debt Evidence

- No second empty-state registry was introduced.
- No host-global editable copy overrode plugin-owned kind semantics.
- No hooks, checks, or runtime rules were relaxed.

## No-Stub Evidence

- `CanvasKindRegistration.emptyState` is live production code in the shipped
  built-in `dbt` and `transformation` contributions.
- Route tests now prove distinct `dbt` and `transformation` empty postures
  instead of leaving one side implicit.
