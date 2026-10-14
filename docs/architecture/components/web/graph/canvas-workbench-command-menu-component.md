---
title: Canvas Workbench Command Menu Component
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-10-13
---

# Canvas Workbench Command Menu Component

## Owned Concern

The existing Canvas workspace contribution publishes project/file capabilities
and handlers without transferring Canvas controller ownership to the shell.
[GH-3622](https://github.com/dunay2/dvt/issues/3622) places those existing actions
in File; it does not add Insert or another application rail.

This component owns contribution registration, capability-gated presentation
and identity-guarded cleanup. It does not own graph truth, draft persistence,
planning, execution, project storage or authorization.

## Public API

- `CanvasWorkspaceMenuContribution`
- `useCanvasWorkspaceMenuContributionStore`
- `CanvasWorkspaceMenuContributionRegistrar`
- `CanvasWorkspaceMenuControls`
- `CanvasWorkspaceTopBarIdentity`

`CanvasShellMainPanel` registers the active contribution. The shell
`ShellFileMenuTemplate` composes `CanvasWorkspaceMenuControls`; the owning
Canvas handlers still execute project import, files/code and snapshots.
`CanvasWorkspaceTopBarIdentity` presents the active Canvas/model tabs separately.

## Invariants

- Canvas file actions exist only while their route contribution is active.
- File menus do not duplicate Canvas controller hooks, stores or command rails.
- Disabled or missing handlers cannot dispatch through menu selection.
- Pointer and keyboard share Radix selection semantics, not raw click callbacks.
- Snapshot selection retains its input until the native chooser produces a
  file; an empty selection does not import or close File. A non-empty selection
  captures the file and clears the input before requesting menu close and
  dispatching the existing import handler. Radix restores focus to File; reopening
  the menu permits the same file to be selected again.
- Project creation reuses its existing dialog and port; it does not require a
  Canvas contribution.
- Code/explorer return focus to File. Granted-scope recovery remains Project.
- Source import registers a source only; dragging creates the graph instance.
- Graph-local insertion and execution retain their existing owners. File does
  not become a second Run or Insert surface.
- Identity-guarded cleanup cannot clear a newer route contribution.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> NoCanvasCommands
  NoCanvasCommands --> CanvasCommandsActive: CanvasShellMainPanel registers
  CanvasCommandsActive --> CanvasCommandsActive: capability or identity changes
  CanvasCommandsActive --> CanvasCommandsActive: stale cleanup ignored
  CanvasCommandsActive --> NoCanvasCommands: active contribution unmounts
```

## Component Flow

```mermaid
flowchart LR
  Panel[CanvasShellMainPanel] --> Registrar[CanvasWorkspaceMenuContributionRegistrar]
  Registrar --> Store[canvasWorkspaceMenuContributionStore]
  Store --> Controls[CanvasWorkspaceMenuControls]
  File[ShellFileMenuTemplate] --> Controls
  Controls --> Handlers[Existing Canvas-owned project and snapshot handlers]
```

## Command And Query Rails

### Native Snapshot Selection Lifecycle

The retained receiver previously dispatched import without closing the controlled
File menu. Review of [PR-3627](https://github.com/dunay2/dvt/pull/3627) identified
that incomplete presentation transition. Selection now notifies `ShellFileMenu`
through a specific callback passed by its passive template. The controller owns
menu closure; the Canvas contribution retains import admission and dispatch.
Unlike Code and New Project, snapshot import does not transfer focus to another
editor or dialog, so the normal Radix close autofocus remains enabled.
Focus returns when the menu content unmounts, not as a prerequisite to import.

```mermaid
flowchart LR
  Picker[Native picker; menu and receiver retained] --> Choice{File selected?}
  Choice -->|No| Retain[No import; retain receiver]
  Choice -->|Yes| Capture[Capture File and clear input]
  Capture --> Close[Controller requests File closure]
  Close --> Import[Existing ImportProjectSnapshot handler]
```

The presentation reuses `ResolveCanvasProjectSnapshotActions`,
`ImportProjectSnapshot`, `ExportProjectSnapshot`, `ImportDbtProject` and the
existing workspace-file/code queries. Their capability and authorization
checks remain in the owning application ports and route controllers.
Project scope selection remains `SelectWorkspaceScope` in Project.

## Consumers And Evidence

- `CanvasShellMainPanel`
- `ShellFileMenuTemplate`
- `ShellTopBar` (identity only)
- `CanvasWorkspaceMenuControls.test.tsx`
- `TopAppBar.test.tsx`
- `canvas-workbench-screen-composition.cy.ts`
- `canvas-project-snapshot-roundtrip.cy.ts`
- `code-workbench-workspace-files.cy.ts`

## User Stories Covered

See [Workbench UX Canon User Stories](../workbench-ux-canon-component.md#section-workbench-ux-canon-user-stories).

## Fitness Functions

- `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/TopAppBar.test.tsx src/app/views/canvas/CanvasWorkspaceMenuControls.test.tsx`
- `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/shell/shellNavigationDisposition.architecture.test.ts`
- `pnpm --filter @dvt/web typecheck`
- `pnpm docs:feature-mechanization:implementation`
- `pnpm verify:prepush`

## Drift To Prevent

- Reintroducing file commands or global navigation into Project or View.
- Changing granted scope through File or hiding the existing recovery path.
- Closing the native snapshot receiver before a selected file reaches it.
- Leaving File open after a non-empty snapshot selection or suppressing its
  normal focus return when no other surface receives focus.
- Bypassing pending-edit guards or contribution capabilities.
- Claiming implementation of Insert or other absent shell capabilities.
