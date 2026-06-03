---
title: Canvas Workspace Explorer User Stories
status: Review
owner: Frontend / Architecture
last_reviewed: 2026-05-27
---

# Canvas Workspace Explorer User Stories

## Scope

These stories cover Workspace Explorer resource discovery plus the first
project-canvas lifecycle slice: list, select, rename, and delete worksheets
inside one protected draft. They intentionally do not cover table modeling, Git
sync, annotations, or console commands; those remain separate Planning DB
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
- canonical graph-node resources use the canonical node drag MIME type;
- project resources such as schemas use the project resource drag MIME type;
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

### US-WEB-CANVAS-EXPLORER-006: Keep multiple canvas worksheets available

As an operator, I can create a new canvas without losing the current one so
that I can work with several project worksheets in the same draft.

Acceptance:

- `New canvas` creates a new worksheet and makes it active;
- the previous active canvas remains listed in the left Explorer;
- the active canvas row is visibly marked;
- the saved protected draft contains all canvas workspaces.

### US-WEB-CANVAS-EXPLORER-007: Select a canvas from the project list

As an operator, I can select another canvas from the left Explorer so that I
can move between worksheets naturally.

Acceptance:

- selecting a canvas row activates that canvas;
- the current active graph is preserved before switching;
- selecting the already-active row is a no-op;
- node-type creation remains in `Insert`, not in the Explorer.

### US-WEB-CANVAS-EXPLORER-008: Rename and inspect canvas properties

As an operator, I can open the Inspector with no node selected and edit the
active canvas name while seeing its id, kind, execution environment, and
permission posture.

Acceptance:

- the Inspector shows `Canvas properties` when no node is selected;
- a blank canvas name is rejected;
- applying a rename updates the active canvas and its workspace entry;
- read-only posture disables the form.

### US-WEB-CANVAS-EXPLORER-010: Select the canvas execution environment

As an operator, I can choose the active canvas execution environment from the
Inspector so that planning and running the canvas uses the environment I meant
for that worksheet.

Acceptance:

- the Inspector lists configured workspace environments for the active canvas;
- changing the environment saves through `UpdateCanvasProperties`;
- Plan preview uses the active canvas environment when it is set;
- Run start uses the same active canvas environment as the preview;
- when no canvas environment is set, execution falls back to the workspace
  session environment.

### US-WEB-CANVAS-EXPLORER-011: Assign schema resources to node cards

As an operator, I can drag a schema resource from the project explorer onto an
existing card so that the card adopts that schema without creating another
node.

Acceptance:

- schemas inferred from project node metadata appear as grouped resources;
- dragging a schema row emits `CanvasWorkspaceResourceDragPayload`;
- dropping a schema onto a compatible card updates node metadata;
- dbt nodes update both `metadata.config.schema` and `metadata.dbt.schemaName`;
- read-only posture rejects the attachment command.

### US-WEB-CANVAS-EXPLORER-009: Delete a canvas deliberately

As an operator, I can delete the active canvas from the Inspector when there is
another worksheet to activate.

Acceptance:

- delete is disabled when only one canvas exists;
- deleting the active canvas activates a remaining canvas;
- deletion is persisted through the protected draft CAS command;
- deletion is unavailable in read-only posture.

## Negative Scenarios

| Scenario              | Expected behavior                                            | Guard                                       |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| Duplicate create list | Explorer does not render `Add node`                          | `DbtExplorer.test.tsx`                      |
| Shell leakage         | `CanvasShell` does not pass `authoringNodeKinds` to explorer | `CanvasShell.architecture.test.tsx`         |
| Read-only drag        | Explorer rows render with `draggable=false`                  | `DbtExplorer.test.tsx`                      |
| Hidden mutation       | Explorer has no `onCreateAuthoringNode` prop                 | `CanvasShell.architecture.test.tsx`         |
| Stale import          | Empty explorer does not create synthetic resources           | future resource catalog test                |
| Replacing canvas      | New canvas appends instead of replacing the current one      | `canvasCreateCanvasDocumentCommand.test.ts` |
| Last canvas delete    | Delete is disabled when no fallback canvas exists            | `CanvasInspectorPanel.test.tsx`             |
| Local-only lifecycle  | Canvas transitions update protected draft payloads           | `canvasProjectCanvasLifecycle.test.ts`      |
| Ignored environment   | Plan/Run use the active canvas environment when selected     | `useCanvasExecutionActions.*.test.tsx`      |
| Schema creates node   | Schema drag attaches metadata instead of creating a node     | `useCanvasGraphHandlers.nodeDrop.test.tsx`  |
| Stale card metadata   | Viewport refreshes when only node metadata changes           | `useCanvasViewportGraphModel.test.tsx`      |

## Coverage Matrix

- US-WEB-CANVAS-EXPLORER-001: `DbtExplorer.test.tsx`
- US-WEB-CANVAS-EXPLORER-002:
  `DbtExplorer.test.tsx`, `CanvasShell.test.tsx`,
  `CanvasShell.architecture.test.tsx`
- US-WEB-CANVAS-EXPLORER-003: `DbtExplorer.test.tsx`
- US-WEB-CANVAS-EXPLORER-004: `DbtExplorer.test.tsx`
- US-WEB-CANVAS-EXPLORER-005: `CanvasShell.test.tsx`
- US-WEB-CANVAS-EXPLORER-006:
  `canvasCreateCanvasDocumentCommand.test.ts`,
  `canvasWorkspaceExplorerModel.test.ts`
- US-WEB-CANVAS-EXPLORER-007:
  `canvasProjectCanvasLifecycle.test.ts`, `CanvasShell.test.tsx`
- US-WEB-CANVAS-EXPLORER-008:
  `CanvasInspectorPanel.test.tsx`, `canvasProjectCanvasLifecycle.test.ts`
- US-WEB-CANVAS-EXPLORER-009:
  `CanvasInspectorPanel.test.tsx`, `canvasProjectCanvasLifecycle.test.ts`
- US-WEB-CANVAS-EXPLORER-010:
  `CanvasInspectorPanel.test.tsx`,
  `useCanvasExecutionActions.planPreview.core.test.tsx`,
  `useCanvasExecutionActions.runStart.test.tsx`
- US-WEB-CANVAS-EXPLORER-011:
  `canvasWorkspaceExplorerModel.test.ts`, `DbtExplorer.test.tsx`,
  `DbtNodeComponent.architecture.test.ts`,
  `useCanvasGraphHandlers.nodeDrop.test.tsx`,
  `useCanvasViewportGraphModel.test.tsx`
