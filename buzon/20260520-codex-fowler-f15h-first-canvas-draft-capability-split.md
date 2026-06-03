---
title: Fowler analysis for first Canvas draft capability split
status: Draft
date: 2026-05-20
owner: Codex
---

# Fowler Analysis: First Canvas Draft Capability Split

## Scope

This analysis covers the post-F15G drift observed on the Canvas entry screen:
the first Canvas template choices can still be disabled because the authoring
runtime receives draft persistence authority through graph edge-edit
permission. The existing command rail remains `CreateCanvasDocumentCommand`,
persisted through `PUT /workspace/graph/draft`.

## Mature-System Comparison

Mature workbench systems split document lifecycle authority from editor
mutation authority:

- document lifecycle capabilities decide whether an empty workspace may create
  its first persisted document;
- graph/node/edge mutation capabilities decide whether an existing document can
  be edited;
- session projection carries named capabilities rather than forcing unrelated
  commands through one UI boolean;
- route runtime code consumes capability vocabulary and does not infer
  transport authority from presentation editability.

DVT already has the right command rail and policy extraction. The remaining
gap is the capability projection seam between the protected session context and
the Canvas authoring runtime.

## Improved Patterns

| Area                    | Improvement already present                         | Fowler / DDD reading                        |
| ----------------------- | --------------------------------------------------- | ------------------------------------------- |
| Command rail            | `CreateCanvasDocumentCommand` persists first canvas | Command, Application Service                |
| Availability policy     | `deriveCanCreateCanvasDocument` owns first-create   | Policy Object                               |
| Host cycle presentation | `needs_canvas` checks `canCreateCanvasDocument`     | Presentation Model                          |
| Component docs          | First-canvas guide names public API and invariants  | Semantic encapsulation                      |
| Browser proof           | Cypress checks the visible workbench posture        | Semantic Fitness Function, late proof layer |

## Antipatterns Detected

| Antipattern          | Evidence                                                                        | Consequence                                                    |
| -------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Feature envy         | `useCanvasController` feeds draft transport from `userPermissions.canEditEdges` | Controller leaks graph-edit semantics into document lifecycle. |
| Primitive obsession  | One boolean represents both draft persistence and edge-editability              | The first-canvas route can be blocked for the wrong reason.    |
| Documentation drift  | Docs say first-canvas creation must not reuse `canEditEdges`                    | Code can still regress while doc and tests look aligned.       |
| Test-only confidence | Existing policy tests prove local availability, not session projection          | A real session with explicit edge denial is not covered.       |

## Component Grouping

The fix should keep one component boundary and one command rail:

- `authorizationStore.ts`
  - owns server-projected UI capability cache;
  - adds `canPersistGraphDraft` as a first-class capability.
- `protectedRouteSessionContext.ts`
  - maps `workspace:graph-draft:save` to `canPersistGraphDraft`;
  - keeps explicit `canEditEdges` separate.
- `canvasAuthoringRuntime.types.ts`
  - exposes `canPersistGraphDraftTransport` as the runtime input.
- `useCanvasAuthoringRuntime.ts`
  - combines draft persistence capability with backend mutation posture.
- `useCanvasController.ts`
  - passes `store.userPermissions.canPersistGraphDraft` to the runtime.

## Repetitions

- `canEditEdges` appears in graph handler, viewport, shell, toolbar, and route
  read-only contexts. Those uses are valid for graph mutation.
- The only repeated semantic error is using `canEditEdges` as a proxy for draft
  persistence. That repetition must be removed rather than hidden behind a
  second alias.

## Opportunities

| Opportunity          | Pattern applied                                        | Owner                                       |
| -------------------- | ------------------------------------------------------ | ------------------------------------------- |
| Boundary drift       | Split capability projection from graph editability     | Protected route session context             |
| Primitive obsession  | Replace overloaded boolean with named capability       | Authorization store                         |
| Feature envy         | Runtime consumes draft persistence intent directly     | Canvas authoring runtime                    |
| Test-only confidence | Add semantic architecture and session projection tests | Web architecture and route controller tests |

## Drift Review

| Drift surface | Current state                                                    | Fix in this slice                                               |
| ------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Code          | Draft persistence enters runtime as `canEditDraftTransport`      | Rename input to `canPersistGraphDraftTransport`.                |
| Code          | `useCanvasController` passes `canEditEdges` to draft persistence | Pass `canPersistGraphDraft`.                                    |
| Docs          | First-canvas docs name the invariant but not session projection  | Update component guide and user stories with capability split.  |
| Tests         | No red case for explicit graph-edit denial with draft-save scope | Add projection, controller, and architecture guards.            |
| UX copy       | Disabled first-canvas state blames graph editing                 | No copy change here; the root capability split should avoid it. |

## Future Lessons

- Do not use a permission named after an editor gesture as a transport
  capability for a lifecycle command.
- Session projection should name product capabilities before route runtime code
  consumes them.
- Architecture tests must prove the handoff path, not only the local policy
  function.
- Browser evidence is useful after the capability seam is semantically tested.

## Capability Flow

```mermaid
flowchart LR
  Session["GET /session scopes"]
  Projection["protectedRouteSessionContext"]
  Store["authorizationStore.canPersistGraphDraft"]
  Controller["useCanvasController"]
  Runtime["useCanvasAuthoringRuntime"]
  Policy["deriveCanCreateCanvasDocument"]
  Command["CreateCanvasDocumentCommand"]
  Draft["PUT /workspace/graph/draft"]

  Session --> Projection
  Projection --> Store
  Store --> Controller
  Controller --> Runtime
  Runtime --> Policy
  Policy --> Command
  Command --> Draft
```

## Selected Option

Add `canPersistGraphDraft` to the server-projected UI permissions and route the
first-canvas runtime through that capability. Keep `canEditEdges` for existing
graph mutation, viewport editability, node handlers, and shell read-only
posture.

## Rejected Alternatives

- Re-enable template buttons unconditionally in `needs_canvas`: rejected
  because it creates a fake success path outside the protected draft boundary.
- Treat all `workspace:graph-draft:save` sessions as edge-edit sessions:
  rejected because explicit graph-edit denial must remain meaningful.
- Add a second first-canvas route or endpoint: rejected because
  `CreateCanvasDocumentCommand` already owns the command rail.

## ADR Decision

No ADR is required. This is a local web capability projection correction behind
an existing command rail. It does not change API contracts, protected draft
storage authority, engine behavior, adapter behavior, or public compatibility.
