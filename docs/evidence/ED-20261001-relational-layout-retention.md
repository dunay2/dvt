---
title: Completed relational layout retention evidence
status: final
date: 2026-10-01
owners:
  - '@dvt/web'
  - '@dvt/contracts'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtRelationalAuthoringDraft.v1.ts
  - apps/web/src/app/views/canvas/canvasRelationalAuthoringDraft.ts
  - apps/web/src/app/views/canvas/useCanvasRelationalAuthoringDraftHydration.ts
  - apps/web/src/app/views/canvas/relational-layout/useRelationalCardPlacement.ts
  - apps/web/cypress/e2e/canvas/canvas-relational-layout-persistence.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/web test:unit:run src/app/views/canvas/canvasRelationalAuthoringDraft.test.ts src/app/views/canvas/canvasRelationalDraftApply.test.ts src/app/views/canvas/canvasInspectorAuthoringModel.test.ts
    - pnpm --filter @dvt/web test:presentation:run src/app/views/canvas/CanvasRelationalTreeWorkbench src/app/views/canvas/useCanvasRelationalTreeDraftState.test.tsx src/app/views/canvas/CanvasModelEditor.navigation.test.tsx
    - pnpm --filter @dvt/web test:presentation:run src/app/views/canvas/relational-layout
    - pnpm --filter @dvt/web test:architecture:run src/app/views/canvas/CanvasRelationalTreeLayout.architecture.test.ts src/app/views/canvas/CanvasRelationalTreeWorkbench.architecture.test.ts src/app/views/canvas/CanvasNodeWorkbenchDraftController.architecture.test.ts
    - pnpm --filter @dvt/web test:e2e:native --spec cypress/e2e/canvas/canvas-relational-layout-persistence.cy.ts
    - pnpm --filter @dvt/web test:e2e:native --spec cypress/e2e/canvas/canvas-relational-card-movement.cy.ts,cypress/e2e/canvas/canvas-relational-card-cancellation.cy.ts
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm arch:deps
---

# Completed relational layout retention

## Authority and design

[Issue #3526](https://github.com/dunay2/dvt/issues/3526) carries the preimplementation
diagrams, rationale, Fowler matrix and acceptance. Parent #3474 remains open.
Governing sources are AGENTS.md, ADR-0064, command/query and Fowler governance,
the Canvas workbench command/query catalog and the workspace graph draft contract.
Planning DB design GH-3296-SEMANTIC-EDITOR-PRODUCT-V1 and mechanization
GH-3526-RELATIONAL-LAYOUT-RETENTION reuse ConfigureCanvasDvtNode,
SaveWorkspaceGraphDraft and ProjectCanvasRelationalTree. There is no new rail.

The existing v1 DTO now permits absent outputRelationId only without pending
sources or operations. Absent means the current canonical document owns Output;
null remains explicit disconnection; a string remains pending terminal intent.
Completion removes obsolete terminal intent while keeping nonempty coordinates.
Inspection hydrates coordinates without entering an edit session. This is a
coordinated current-contract hardcut, not mixed-client compatibility, migration
or a v2. No historical terminal is inferred from layout.

Visual review additionally exposed that accepted movement pinned all provisional
automatic coordinates, allowing Output to overlap a subsequent root. Gesture
preview still freezes visible positions; acceptance retains only the moved
identity and previously manual positions. Automatic cards reflow on graph change.
Explicit Output movement, keyboard movement, cancellation and zoom remain covered.

## RED / GREEN evidence

- Contract RED: layout-only omission rejected; GREEN: full contracts suite,
  709 tests, including pending-omission rejection and malformed coordinates.
- Retention RED: completed positions lost and applied-card positions filtered;
  GREEN: 58 focused authoring/apply/inspector unit tests.
- Mounted hydration initially reopened layout-only state in editing mode;
  corrected at the hydration boundary. The 30 affected presentation files pass
  67 tests, including inspection after Apply and navigation/cancellation.
- Gesture RED: pointer and keyboard published unwanted automatic Output entries;
  GREEN: six layout presentation files pass 39 tests. Three architecture files
  pass nine tests; lint, typecheck and dependency boundaries pass.
- Native RED confirmed the unwanted persisted automatic identities. The new
  browser case passes after the fix: move JOIN, Apply Filter, reload, Apply a
  second Filter, reload. It checks exact retained metadata, stable coordinates,
  both canonical Filter relations, Output after the current root without overlap,
  and no implicit Preview/Run request. Eight existing movement and three
  cancellation browser cases also pass without skipped tests.

The native proof uses the real built web application with the existing stateful
HTTP test adapter on temporary port 4173. It proves front-end draft requests and
reload behavior, not live PostgreSQL, API CAS durability or provider execution.
The initial fixture-bootstrap save race was corrected by awaiting that existing
request before counting writes; it is not hidden as a product pass.

## Integration and integrity

The ARC evaluator classifies the complete implementation diff ARC-2, requiring
this evidence and a risk update, not rollout or compatibility-matrix artifacts.
Final prepush, exact base/head Planning DB implementation acceptance and required
CI results are recorded in #3526 and its implementation PR. The current editor
and API must deploy together for the new layout-only payload; no compatibility
fallback is added.

Movement alone keeps its existing discardable-session behavior. This cut does
not add layout-only autosave, change navigation policy, redesign auto-layout or
reinterpret old stored manual coordinates. No application database or provider
was changed, no legacy editor reactivated, no stub/debt or TODO added, no rule
relaxed and no hook bypassed. The unrelated obsolete card-menu experiment #3525
was withdrawn and closed not planned, not presented as an integrated fix.
