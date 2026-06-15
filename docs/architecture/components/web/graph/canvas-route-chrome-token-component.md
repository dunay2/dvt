---
title: Canvas route chrome token component
status: Active
owner: Web / Canvas
last_reviewed: 2026-05-22
domain: frontend
---

# Canvas Route Chrome Token Component

## Purpose

This component owns Canvas toolbar and tab-strip visual tokens. Canvas route
chrome can stay aligned with the operator-workbench visual system without
placing raw Tailwind color families in command controls or tab templates.

Owned concern: Canvas route chrome consumes named presentation tokens;
`theme.css` owns raw semantic values.

## Public API

| API                                    | Kind         | Contract                                                  |
| -------------------------------------- | ------------ | --------------------------------------------------------- |
| `canvasChromeClasses`                  | constant     | Shared toolbar, separator, button, dialog, and tab chrome |
| `canvasDraftStatusToneClasses`         | constant     | Draft save and recovery tone classes                      |
| `resolveCanvasDraftStatusClassName`    | query helper | Resolves `neutral`, `warning`, or `danger` draft tone     |
| `resolveCanvasWorkflowStatusClassName` | query helper | Resolves workflow status text tone for toolbar badges     |

## Invariants

1. Canvas toolbar and tab-strip presentation uses `canvasChromeTokens`.
2. Toolbar and tab-strip modules do not contain raw `slate-*`, `rose-*`,
   `amber-*`, `emerald-*`, `gray-*`, or `zinc-*` color classes.
3. The token component does not own Canvas command availability, graph
   mutation, draft persistence, React Flow configuration, or route policy.
4. Raw color values remain in `theme.css` or user-configurable Canvas palette
   code, not in route chrome components.
5. Low-frequency project snapshot actions stay grouped in the Canvas project
   menu instead of consuming persistent toolbar width as separate buttons.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> ToolbarChromeRequested
  ToolbarChromeRequested --> NeutralStatus: synced or read-only
  ToolbarChromeRequested --> WarningStatus: recovery or plan required
  ToolbarChromeRequested --> DangerStatus: draft failure
  ToolbarChromeRequested --> SuccessStatus: run ready
  NeutralStatus --> ChromeRendered
  WarningStatus --> ChromeRendered
  DangerStatus --> ChromeRendered
  SuccessStatus --> ChromeRendered
```

## Consumers

- `CanvasToolbar` uses toolbar and separator chrome.
- `CanvasToolbarPrimaryControls` uses badge, separator, project menu, and
  command classes.
- `CanvasDraftSaveStatus` resolves draft status tone through token helpers.
- `CanvasToolbarDraftStatus` delegates draft-status rendering to
  `CanvasDraftSaveStatus`.
- `CanvasPlaygroundTabStrip.templates.tsx` uses shared replacement and
  tab-kind token classes.

## Consumer Diagram

```mermaid
flowchart TB
  Theme["apps/web/src/styles/theme.css"]
  Tokens["canvasChromeTokens.ts"]
  Toolbar["CanvasToolbar.tsx"]
  Controls["CanvasToolbarPrimaryControls.tsx"]
  ProjectMenu["Project snapshot menu"]
  DraftWrapper["CanvasToolbarDraftStatus.tsx"]
  Draft["CanvasDraftSaveStatus.tsx"]
  Tabs["CanvasPlaygroundTabStrip.templates.tsx"]
  Guard["canvasRoutePosturePriority.architecture.test.ts"]

  Theme --> Tokens
  Tokens --> Toolbar
  Tokens --> Controls
  Controls --> ProjectMenu
  DraftWrapper --> Draft
  Tokens --> Draft
  Tokens --> Tabs
  Guard --> Tokens
  Guard --> Toolbar
  Guard --> Controls
  Guard --> DraftWrapper
  Guard --> Draft
  Guard --> Tabs
```

## Negative Rules

- Do not move Canvas command policy into `canvasChromeTokens`.
- Do not move React Flow node, edge, viewport, minimap, or grid palette
  semantics into this component.
- Do not create a second Canvas toolbar color map in a route template.
