---
title: Canvas Ready Node Authoring User Stories
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-30
---

# Canvas Ready Node Authoring User Stories

## Scope

These stories cover adding, persisting, reloading, and removing governed nodes
from an existing ready Canvas document through the Explorer rail and node menu.

## Stories

### US-WEB-CANVAS-READY-NODE-001: Add a node after the graph already exists

As an operator editing a ready transformation canvas, I can choose an available
node kind from the Explorer rail so that I can extend the graph without
returning to an empty-state screen.

Acceptance:

- the Explorer shows an `Add node` section when mutation is allowed
- the section lists node kinds from the active canvas kind
- selecting a node kind creates a node through the governed authoring command

### US-WEB-CANVAS-READY-NODE-002: Keep project resources and node creation separate

As an operator, I can still drag project resources from the Explorer while
using explicit create buttons for new local authoring nodes.

Acceptance:

- existing project nodes remain grouped by kind
- create buttons do not replace drag/drop
- both paths use governed node admission

### US-WEB-CANVAS-READY-NODE-003: Respect read-only posture

As a read-only operator, I can inspect project resources without seeing
mutating node creation actions.

Acceptance:

- `Add node` is hidden when `canEditEdges` is false
- project resources remain visible for inspection
- import and creation commands are not exposed

### US-WEB-CANVAS-READY-NODE-004: Use the active canvas runtime catalog

As a platform maintainer, I need ready-canvas creation to use the active canvas
runtime catalog so plugin-specific node kinds do not leak across canvases.

Acceptance:

- the catalog is selected by `canvasDocument.kind`
- no global node-kind catalog is used in the shell panels builder
- unsupported or missing canvas documents expose no ready-canvas create list

### US-WEB-CANVAS-READY-NODE-005: Preserve admission policy

As a platform maintainer, I need button-created nodes to pass through the same
admission policy as dropped or empty-state nodes.

Acceptance:

- `DbtExplorer` only calls `onCreateAuthoringNode`
- the command continues through `useCanvasAuthoringNodeCreationHandlers`
- invalid node kinds are rejected by runtime admission before effects

### US-WEB-CANVAS-READY-NODE-006: Preserve authored nodes after reload

As an operator, I can add a governed node, let the draft save, and reload the
Canvas route so that the authored node remains visible from the authoritative
draft.

Acceptance:

- adding a node triggers a protected draft save
- reloading the route reads the saved draft state
- the authored node is visible after reload

### US-WEB-CANVAS-READY-NODE-007: Persist node removal after reload

As an operator, I can remove an authored node, let the draft save, and reload
the Canvas route so that the removed node does not return.

Acceptance:

- removing a node triggers a protected draft save
- reloading the route reads the saved draft state
- the removed node is absent after reload

### US-WEB-CANVAS-READY-NODE-008: Do not present failed saves as persisted

As an operator, I must not see a failed save treated as durable authoring state
after reload.

Acceptance:

- a failed save leaves the local node visible only in the current session
- reloading the route returns to the last authoritative draft
- the unsaved node is absent after reload

## Negative Scenarios

| Scenario                  | Expected behavior                                               | Guard                                    |
| ------------------------- | --------------------------------------------------------------- | ---------------------------------------- |
| Mutation denied           | Explorer hides `Add node` and exposes no creation command       | `canvasShellPanelsBuilder.test.ts`       |
| Save failed               | locally added node is not treated as persisted after reload     | `canvas-ready-node-authoring.cy.ts`      |
| Canvas document missing   | no ready-canvas authoring catalog is exposed                    | `canvasShellPanelsBuilder.ts` null guard |
| Wrong canvas kind         | node kinds come only from the matching `CanvasKindRegistration` | `CanvasShell.architecture.test.tsx`      |
| Global catalog temptation | shell panels builder must not call `getAllNodeKinds`            | `CanvasShell.architecture.test.tsx`      |
| UI bypass                 | Explorer must call `onCreateAuthoringNode`, not draft lifecycle | `CanvasShell.architecture.test.tsx`      |

## Coverage Matrix

- US-WEB-CANVAS-READY-NODE-001:
  `DbtExplorer.test.tsx`, `CanvasShell.test.tsx`,
  `canvas-ready-node-authoring.cy.ts`
- US-WEB-CANVAS-READY-NODE-002:
  `DbtExplorer.test.tsx`, `useCanvasGraphHandlers.nodeDrop.test.tsx`,
  `canvas-ready-node-authoring.cy.ts`
- US-WEB-CANVAS-READY-NODE-003:
  `canvasShellPanelsBuilder.test.ts`, `DbtExplorer.test.tsx`,
  `canvas-ready-node-authoring.cy.ts`
- US-WEB-CANVAS-READY-NODE-004:
  `canvasShellPanelsBuilder.test.ts`, `CanvasShell.architecture.test.tsx`
- US-WEB-CANVAS-READY-NODE-005:
  `CanvasShell.architecture.test.tsx`, `canvas-ready-node-authoring.cy.ts`,
  existing node admission tests
- US-WEB-CANVAS-READY-NODE-006: `canvas-ready-node-authoring.cy.ts`
- US-WEB-CANVAS-READY-NODE-007:
  `canvas-ready-node-authoring.cy.ts`, `useCanvasGraphHandlers.nodeRemoval.test.tsx`
- US-WEB-CANVAS-READY-NODE-008: `canvas-ready-node-authoring.cy.ts`
