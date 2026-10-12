---
title: Canvas Workbench Screen Composition Component
status: Active
owner: Frontend / Shell / Canvas
last_reviewed: 2026-10-12
component_type: frontend-component
---

# Canvas Workbench Screen Composition Component

## Owned Concern

This component owns the whole `/canvas` workbench screen composition at the
boundary between persistent shell chrome and Canvas route chrome. It decides
where global navigation, workspace context, Canvas commands, first-document
copy, and visual preferences are presented.

It does not own graph persistence, protected draft semantics, Admin route
behavior, Plugins route behavior, or backend contracts.

## Approved Menu Responsibility Contract

[The bounded menu cut](https://github.com/dunay2/dvt/issues/3622), approved under
#3296, supersedes the older mixed `ShellMenu` placement described below. It does
not accept the entire Figma migration or introduce another application rail.

| Surface                | Owned concern                                                 | Existing authority                                           |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| Raven application menu | Global destinations when the navigation rail is hidden; About | `ListShellNavigationItems`, `GetCompiledApplicationMetadata` |
| Project menu           | Granted project/environment selection, context and Git        | `GetEffectiveWorkspaceContext`, `SelectWorkspaceScope`       |
| File menu              | New Project and active project import/export, files and code  | `CreateProject`, existing Canvas workspace contribution      |
| View menu              | Explorer/drawer recovery, focus mode and ES/EN preference     | Existing layout commands, `ConfigureApplicationLanguage`     |
| Execution controls     | Existing explicit execution intent/readiness                  | Unchanged operational contribution                           |

```mermaid
flowchart LR
  Raven[Raven] --> Routes[Existing Router navigation and pending-edit guard]
  Project[Project] --> Scope[Granted scope port and read-only context]
  File[File] --> Contribution[Existing project/file commands]
  View[View] --> Layout[Existing layout and language preferences]
```

Each action has one menu owner. Controllers retain lifecycle and dispatch;
concern-specific templates own passive markup and shared chrome styles. No
generic menu framework, new store or second command catalog is introduced.
Menu opening does not execute data queries or change graph authoring state.

Focus ownership follows the selected intent: code/explorer and project creation
return to File; granted-scope recovery remains Project. A menu closing to open
an editor/dialog must not steal the receiving surface's focus. Router navigation
must preserve the existing unapplied-edit guard.

Source import still registers only; dragging creates an instance. This contract
does not add Source double-click/Insert creation, change JOIN output, or expose
unimplemented Edit/Undo/Insert/Run/Help capabilities.

## Public API

| API                          | Kind                   | Responsibility                                                                                                  |
| ---------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ShellTopBar`                | shell renderer         | Renders low-noise global chrome and delegates hidden route-family controls to `ShellMenu`.                      |
| `ShellMenu`                  | shell renderer         | Renders global navigation, workspace context, view controls, and active Canvas view contributions.              |
| `CanvasShellMainPanel`       | Canvas route renderer  | Places Canvas tabs, route-local toolbar, banners, viewport, and center-surface states.                          |
| `CanvasToolbar`              | Canvas route renderer  | Renders graph/document commands only inside the Canvas workbench.                                               |
| `CanvasTemplatePresentation` | presentation model     | Resolves route-visible first-canvas template title and description from a `CanvasKindRegistration` plus locale. |
| `CanvasPlaygroundHost`       | Canvas host controller | Builds `CreateCanvasDocumentCommand` from the selected template presentation.                                   |

## Invariants

- Canvas workbench routes do not mount a permanent left navigation rail.
- Canvas route commands must not render inside the persistent global top bar.
- `ShellTopBar` may show global health and the menu trigger; route-local Canvas
  command controls belong in Canvas workbench chrome.
- `Admin` and `Plugins` remain reachable when the rail is hidden.
- The first-canvas state must not show disabled Plan, Run, Export, or Import
  controls before a canvas document exists.
- Workspace context is read-only on the Canvas entry screen. Switching project,
  tenant, or environment belongs to a separate governed flow.
- Visible first-canvas template title and description are resolved by a
  presentation model, not by leaking raw plugin registry strings directly into
  the route.
- The selected first-canvas command continues through `CreateCanvasDocumentCommand`;
  no parallel first-canvas rail is introduced.
- Shell copy and Canvas entry copy must not mix locale families on the same
  first viewport.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> GlobalRoute
  GlobalRoute --> CanvasWorkbench: pathname starts /canvas
  CanvasWorkbench --> NeedsCanvas: no persisted canvas document
  NeedsCanvas --> CreatingCanvas: template selected
  CreatingCanvas --> EmptyCanvas: command persisted
  EmptyCanvas --> GraphReady: first node added
  GraphReady --> GlobalRoute: navigate to non-Canvas route

  CanvasWorkbench: top bar low-noise
  NeedsCanvas: no route command toolbar
  EmptyCanvas: route-local toolbar allowed
  GraphReady: route-local plan/run allowed
```

## Shell And Route Flow

```mermaid
flowchart LR
  Router["React Router pathname"]
  Disposition["ResolveShellNavigationDisposition"]
  TopBar["ShellTopBar"]
  Menu["ShellMenu"]
  CanvasPanel["CanvasShellMainPanel"]
  Toolbar["CanvasToolbar"]
  Host["CanvasPlaygroundHost"]
  Template["CanvasTemplatePresentation"]

  Router --> Disposition
  Disposition --> TopBar
  TopBar --> Menu
  Router --> CanvasPanel
  CanvasPanel --> Toolbar
  CanvasPanel --> Host
  Template --> Host
```

## Sequence

```mermaid
sequenceDiagram
  participant Operator
  participant Shell as ShellTopBar
  participant Menu as ShellMenu
  participant Canvas as CanvasShellMainPanel
  participant Host as CanvasPlaygroundHost
  participant Draft as Workspace graph draft

  Operator->>Shell: Open /canvas
  Shell->>Menu: Publish global navigation and workspace details
  Shell-->>Operator: Show brand, health, and menu only
  Canvas->>Host: Render first-canvas state
  Host-->>Operator: Show localized template choices
  Operator->>Host: Select a template
  Host->>Draft: CreateCanvasDocumentCommand
  Draft-->>Canvas: Persisted canvas document
  Canvas-->>Operator: Render route-local toolbar and graph surface
```

## Consumers

| Consumer                              | Use                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `RootShell`                           | Resolves route family and passes shell navigation model to the top bar. |
| `ShellTopBar`                         | Applies low-noise Canvas posture and owns the menu trigger.             |
| `ShellMenu`                           | Provides hidden-rail global navigation and workspace details.           |
| `CanvasShellMainPanel`                | Applies Canvas route-local command placement.                           |
| `CanvasPlaygroundHost`                | Resolves first-canvas template presentation and command title.          |
| `CanvasToolbar.architecture.test.tsx` | Guards route-local toolbar ownership.                                   |
| `Root.shellChrome.test.tsx`           | Guards no-rail and hidden-rail global navigation.                       |

## Command And Query Rails

| Rail                                 | Type    | Owner                     | Use                                                             |
| ------------------------------------ | ------- | ------------------------- | --------------------------------------------------------------- |
| `ResolveShellNavigationDisposition`  | query   | Frontend shell            | Decides whether Canvas hides the rail.                          |
| `ListShellNavigationItems`           | query   | Frontend shell            | Supplies global route destinations for rail and menu rendering. |
| `GetEffectiveWorkspaceContext`       | query   | Frontend shell            | Supplies read-only workspace and draft posture labels.          |
| `CreateCanvasDocumentCommand`        | command | Canvas document           | Persists the first canvas document after template selection.    |
| `RenderCanvasContextualGraphSurface` | query   | Canvas graph presentation | Proves screen composition without creating product behavior.    |

No backend command/query rail changes are introduced by this component.

## Drift To Prevent

- Reintroducing `shell-top-bar-canvas-controls`.
- Rendering `CanvasToolbar` through a global top-bar portal.
- Showing disabled Canvas route commands in the first-canvas state.
- Hiding Admin or Plugins when the Canvas rail is hidden.
- Rendering raw English plugin template copy inside a Spanish Canvas route.
- Replacing command/query rails with component-local ad hoc actions.
