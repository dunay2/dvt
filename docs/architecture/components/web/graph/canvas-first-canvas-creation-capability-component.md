---
title: Canvas First Canvas Creation Capability Component
status: Active
owner: Frontend / Canvas
last_reviewed: 2026-05-19
planning_type: architecture
---

# Canvas First Canvas Creation Capability Component

## Owned Concern

This component owns the local policy that decides whether the Canvas route may
expose the first Canvas document creation command for the active workspace.

It does not own graph node or edge mutation, template rendering, protected draft
transport, command execution, or shell navigation.

## Public API

| API                                           | Kind             | Responsibility                                                                             |
| --------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `CanvasCreateCanvasDocumentAvailabilityInput` | parameter object | Carries protected draft read posture and write posture into the policy.                    |
| `deriveCanCreateCanvasDocument(input)`        | policy function  | Returns whether `CreateCanvasDocumentCommand` may be offered for a missing draft document. |

## Invariants

- Availability follows protected draft persistence eligibility.
- Availability requires a missing authoritative draft record.
- Availability closes while draft truth is loading or failed.
- Availability closes when the workspace cannot persist graph draft changes.
- Availability must not inspect `canEditEdges`; graph/node/edge mutation begins
  only after a typed Canvas document exists.
- The policy must remain pure and side-effect free.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> DraftLoading
  DraftLoading --> CreationUnavailable: query pending
  DraftLoading --> NeedsCanvas: missing draft and writable
  DraftLoading --> ExistingCanvas: draft record exists
  DraftLoading --> DraftDenied: query failed or not writable

  NeedsCanvas --> CreateCommandOffered: deriveCanCreateCanvasDocument true
  ExistingCanvas --> CreateCommandHidden: command already consumed
  DraftDenied --> CreateCommandHidden: fail closed
  CreationUnavailable --> CreateCommandHidden: wait for truth
```

## Component Flow

```mermaid
flowchart LR
  Query["Protected draft query"]
  Policy["deriveCanCreateCanvasDocument"]
  Lifecycle["useCanvasDraftLifecycle"]
  Controller["canvasControllerViewModel"]
  HostCycle["deriveCanvasHostCycleState"]
  Host["CanvasPlaygroundHost"]
  Command["CreateCanvasDocumentCommand"]

  Query --> Policy
  Policy --> Lifecycle
  Lifecycle --> Controller
  Controller --> HostCycle
  HostCycle --> Host
  Host --> Command
```

## Consumers

- `useCanvasDraftLifecycle.ts`
- `canvasControllerViewModel.ts`
- `canvasRouteViewState.ts`
- `canvasShellPropsBuilder.tsx`
- `canvasShellLayoutBuilder.tsx`
- `canvasCenterSurfaceWorkbench.tsx`
- `canvasHostCycleState.ts`
- `CanvasPlaygroundHost.tsx`

## Drift To Prevent

- Reintroducing `canEditEdges` into first-canvas document creation
  availability.
- Copying protected draft query conditionals into route builders.
- Treating browser e2e proof as a replacement for local policy tests.
- Creating a second first-canvas command rail outside
  `CreateCanvasDocumentCommand`.
