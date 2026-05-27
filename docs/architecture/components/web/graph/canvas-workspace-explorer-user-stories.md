---
title: Canvas Workspace Explorer User Stories
status: Review
owner: Frontend / Architecture
last_reviewed: 2026-05-27
---

# Canvas Workspace Explorer User Stories

## Scope

These stories cover the first Workspace Explorer slice: existing-resource
discovery, read-only behavior, drag readiness, and separation from node-type
creation. They intentionally do not cover canvas lifecycle, table modeling,
Git sync, annotations, or console commands; those are separate Planning DB
tasks.

## Stories

### US-WEB-CANVAS-EXPLORER-001: Browse existing project resources

As an operator, I can open the Canvas left context panel and see project
resources grouped by type so that I understand what exists before I edit the
graph.

Acceptance:

- resources are grouped by resource or node kind;
- each group shows a count;
- the active canvas appears as a project resource when a Canvas document exists;
- resource rows show stable names and metadata badges;
- an empty resource catalog still exposes the governed import affordance when
  edit permissions allow it.

### US-WEB-CANVAS-EXPLORER-002: Keep creation in Insert

As an operator, I use `Insert` to create fresh graph objects so that the side
panel has one meaning: existing project resources.

Acceptance:

- the explorer does not show `Add node`;
- the explorer does not receive node kind registrations;
- the toolbar or top-menu `Insert` owns node-type creation;
- selecting a node kind still calls the governed authoring command.

### US-WEB-CANVAS-EXPLORER-003: Drag an existing resource when editing is allowed

As an operator with edit access, I can drag an existing resource from the
explorer into the graph or a compatible card.

Acceptance:

- rows are draggable when `canEditGraph` is true;
- the drag payload uses the canonical node drag MIME type;
- the explorer emits the optional drag-start callback;
- compatibility checks are handled by graph or inspector drop policy.

### US-WEB-CANVAS-EXPLORER-004: Inspect resources in read-only mode

As a read-only operator, I can inspect available resources without being
offered mutation commands.

Acceptance:

- resource rows remain visible;
- drag is disabled;
- import is disabled;
- node creation is not visible in the explorer.

### US-WEB-CANVAS-EXPLORER-005: Open governed data import

As an operator with edit access, I can open the data registry from the explorer
so that imported resources enter the project catalog through a governed flow.

Acceptance:

- the import action is visible when a registry handler exists;
- the action is disabled in read-only mode;
- the explorer does not fabricate imported rows before the import completes.

## Negative Scenarios

| Scenario              | Expected behavior                                            | Guard                               |
| --------------------- | ------------------------------------------------------------ | ----------------------------------- |
| Duplicate create list | Explorer does not render `Add node`                          | `DbtExplorer.test.tsx`              |
| Shell leakage         | `CanvasShell` does not pass `authoringNodeKinds` to explorer | `CanvasShell.architecture.test.tsx` |
| Read-only drag        | Explorer rows render with `draggable=false`                  | `DbtExplorer.test.tsx`              |
| Hidden mutation       | Explorer has no `onCreateAuthoringNode` prop                 | `CanvasShell.architecture.test.tsx` |
| Stale import          | Empty explorer does not create synthetic resources           | future resource catalog test        |

## Coverage Matrix

- US-WEB-CANVAS-EXPLORER-001: `DbtExplorer.test.tsx`
- US-WEB-CANVAS-EXPLORER-002:
  `DbtExplorer.test.tsx`, `CanvasShell.test.tsx`,
  `CanvasShell.architecture.test.tsx`
- US-WEB-CANVAS-EXPLORER-003: `DbtExplorer.test.tsx`
- US-WEB-CANVAS-EXPLORER-004: `DbtExplorer.test.tsx`
- US-WEB-CANVAS-EXPLORER-005: `CanvasShell.test.tsx`
