---
title: Canvas Startup And Draft Recovery Component
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-01
planning_type: architecture
---

# Canvas Startup And Draft Recovery Component

## Purpose

This guide defines the local component that closes the branch work around route
startup, protected draft read-models, explicit canvas replacement, and node drag
gesture ownership.

Use this page when changing:

- route bootstrap posture for graph-adjacent routes
- workspace graph draft read-model projection
- host-owned create or replace canvas commands
- React Flow whole node drag surface wiring
- scenario coverage for Canvas startup and draft recovery

Do not use it as the multi-canvas architecture. The current model still has one
authoritative workspace draft canvas document per workspace scope.

The phrase "failed route posture" in this guide means a route-local failure
whose first visible surface is already governed and safe to reveal.

User-story coverage lives in
[Canvas Startup And Draft Recovery User Stories](canvas-startup-and-draft-recovery-component.md#section-canvas-startup-and-draft-recovery-user-stories).

Local supporting guides for the current operability slice:

- [API Client Auth Component](../frontend-data-boundary-architecture.md#section-api-client-auth-component)
- [Canvas Layout Persistence Component](./canvas-layout-persistence-component.md)
- [Canvas Draft Access Posture Component](./canvas-draft-access-posture-component.md)

`CanvasDraftAccessPosture` entries in this active guide are planned for
`TF-E2-M-B` until
[Canvas Draft Access Posture Component](./canvas-draft-access-posture-component.md)
changes from `Proposed` to `Active`.

## Public API

| API                                                   | Owner                                        | Responsibility                                                                    |
| ----------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| `createFailedRouteBootstrapPresentation(detail)`      | `routeBootstrapContract.ts`                  | Publish controlled route-local failures that reveal only governed route surfaces. |
| `WORKSPACE_GRAPH_DRAFT_ENDPOINT`                      | `workspaceGraphDraftHttp.ts`                 | Single protected draft HTTP endpoint for draft reads and saves.                   |
| `buildWorkspaceGraphDraftEndpoint(scope)`             | `workspaceGraphDraftHttp.ts`                 | Attach tenant, project, and environment scope to protected draft reads.           |
| `projectWorkspaceGraphDraftReadResponseSnapshot(...)` | `workspaceGraphDraftSnapshotProjection.ts`   | Project protected authoring truth into the DBT-shaped graph snapshot read model.  |
| `CanvasCreateCanvasDocumentCommand`                   | `canvasDraftLifecycle.types.ts`              | Carry `create_first` or `replace_current` canvas-document intent.                 |
| `executeCreateCanvasDocumentCommand(...)`             | `canvasCreateCanvasDocumentCommand.ts`       | Persist first or explicitly replaced canvas documents through CAS draft saves.    |
| `resolveCreateCanvasDocumentCommandEligibility(...)`  | `canvasCreateCanvasDocumentCommandPolicy.ts` | Decide CAS eligibility for first-create and replace-current commands.             |
| `buildBlankCanvasDocumentDraftInput(...)`             | `canvasCreateCanvasDocumentCommandPolicy.ts` | Build the authoritative empty draft save request.                                 |
| `applyCanvasDocumentSaveSuccess(...)`                 | `canvasCreateCanvasDocumentSaveResult.ts`    | Apply saved draft truth to cache, session, and save status.                       |
| `applyCanvasDocumentSaveConflict(...)`                | `canvasCreateCanvasDocumentSaveResult.ts`    | Apply conflict draft truth to cache, session, and save status.                    |
| `CanvasPlaygroundHostTemplate`                        | `CanvasPlaygroundHost.templates.tsx`         | Render first-canvas host HTML without constructing draft command DTOs.            |
| `CanvasShell`                                         | `CanvasShell.tsx`                            | Mount the graph-first Canvas shell without route-mode tabs.                       |
| `CanvasShellMainPanel`                                | `CanvasShellMainPanel.tsx`                   | Render the central graph surface and contextual dialogs from shell props.         |
| `resolveCanvasRecoveryBannerViewState(...)`           | `canvasRecoveryBannerModel.ts`               | Resolve route recovery reason into renderable banner state and copy.              |
| `CanvasRecoveryBannerTemplate`                        | `CanvasRecoveryBanner.templates.tsx`         | Render recovery banner HTML from resolved view state only.                        |
| `deriveCanvasDraftAuthTransportPosture(...)`          | `canvasDraftAuthTransportPosture.ts`         | Planned: normalize final draft auth errors for Canvas posture.                    |
| `CanvasDraftAccessPosture`                            | `canvasDraftAccessPostureModel.ts`           | Planned: resolve protected draft access into one posture.                         |
| `deriveCanvasDraftAccessPosture(...)`                 | `canvasDraftAccessPostureModel.ts`           | Planned: project draft read outcomes into one route-visible posture model.        |
| Whole node drag surface                               | `canvasNodeMapper.ts`                        | Leave React Flow node drag scoped to the node card when mutation is allowed.      |

## Invariants

- `failed` route bootstrap posture is controlled and non-blocking only when the
  route can render a governed failure or recovery surface.
- `error` route bootstrap posture remains reserved for startup contract
  failures where the workbench must not reveal.
- API-mode `WorkspaceGraphSnapshot` reads must go through
  `/workspace/graph/draft` and projection. They must not call a separate
  `/workspace/graph` authority endpoint.
- `create_first` must fail closed when an authoritative draft record already
  exists.
- `replace_current` must fail closed when there is no authoritative draft
  record to replace.
- `replace_current` must save an empty draft through the protected draft port
  with the current revision as `expectedRevision`.
- Create and replacement eligibility must remain behind named semantic helpers;
  route code must not reintroduce anonymous compound conditionals for CAS
  policy.
- `executeCreateCanvasDocumentCommand(...)` must remain an application
  orchestrator. CAS eligibility belongs in
  `canvasCreateCanvasDocumentCommandPolicy.ts`; cache/session effects belong in
  `canvasCreateCanvasDocumentSaveResult.ts`.
- DBT node-type projection must remain a declarative rule table plus a matcher,
  not a growing sequence of branch-local `if` checks.
- Canonical-to-viewport node projection must accept named argument objects for
  projection options; positional argument lists must not hide layout,
  column-lineage, overlay, or persisted-position semantics.
- `workspaceGraphDraftProjection.ts` must project protected authoring truth
  into route-facing draft and canonical semantic graph models only. DBT-shaped
  snapshot rules belong in `workspaceGraphDraftSnapshotProjection.ts`.
- Replacement actions must stay host-owned and draft-CAS guarded; the
  graph-first shell must not reintroduce a fixed route tab strip or a local reset
  shortcut.
- `CanvasPlaygroundHost.tsx` must own first-canvas command construction; its
  template renders host HTML from copy and kind registrations only.
- Recovery-banner state must be resolved by `canvasRecoveryBannerModel.ts`.
  `CanvasRecoveryBanner.templates.tsx` must not import route presentation state
  or Canvas copy catalogs.
- Draft access posture must be resolved once by
  `canvasDraftAccessPostureModel.ts`. Toolbar labels, recovery banner state,
  center-surface draft blockers, interaction gating, and route bootstrap must
  consume that posture instead of re-deriving `forbidden`, `read_only`, format,
  or recovery conditions locally.
- Draft auth transport posture must be resolved by
  `canvasDraftAuthTransportPosture.ts` from final protected draft query errors;
  Canvas route modules must not import API token refresh helpers.
- Draft access posture must feed runtime command admission before graph edit,
  draft save, plan, or run controls become enabled.
- Draft access recovery actions must be resolved before JSX template rendering.
  Recovery templates render callbacks and labels only.
- The toolbar synced label must be emitted only when the posture is writable and
  no recovery, access-denial, read-only, format, or pending state is active.
- The tab-strip replacement action must stay disabled when effective route
  permissions deny graph editing.
- Node drag remains permission-gated by `CanvasViewport`; the whole node drag
  surface is active only when dragging is already allowed.
- `DbtNodeComponent.tsx` renders node shell and plugin decorations only; it must
  not own graph mutation policy or draft persistence.

## Transitions

### Startup posture

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> Complete: route read model ready
  Pending --> Failed: governed route failure surface exists
  Pending --> Blocked: unsafe to reveal workbench
  Pending --> Error: bootstrap contract failure
  Failed --> Complete: route recovers
  Blocked --> Complete: blocker resolves
  Error --> Error: fail-fast startup contract posture
```

### Draft replacement

```mermaid
sequenceDiagram
  participant Operator
  participant Host as CanvasPlaygroundHost
  participant Command as executeCreateCanvasDocumentCommand
  participant Draft as protected workspace draft port
  participant Cache as draft query cache
  participant Session as canvasDraftSession

  Operator->>Host: New canvas
  Host->>Operator: confirm replacement
  Operator->>Host: confirm
  Host->>Command: replace_current(kind,title)
  Command->>Command: resolve eligibility and blank draft input
  Command->>Draft: saveGraphDraft(expectedRevision=current)
  Draft-->>Command: saved or conflict
  Command->>Cache: apply authoritative remote draft state
  Command->>Session: apply save success or conflict transition
```

### Protected snapshot projection

```mermaid
flowchart LR
  ApiService["workspaceService.api.ts"] --> Endpoint["/workspace/graph/draft"]
  Endpoint --> Contract["WorkspaceGraphDraftReadResponse"]
  Contract --> Projection["workspaceGraphDraftSnapshotProjection.ts"]
  Projection --> Snapshot["WorkspaceGraphSnapshot read model"]
  Snapshot --> RouteConsumers["graph snapshot route consumers"]
```

### Whole node drag surface

```mermaid
flowchart LR
  Policy["effectiveUserPermissions.canEditEdges"] --> Viewport["CanvasViewport nodesDraggable"]
  Mapper["canvasNodeMapper.ts"] --> Node["React Flow node without dragHandle selector"]
  Viewport --> Gesture["React Flow whole node drag gesture"]
  Node --> Gesture
```

### Recovery banner presentation

```mermaid
flowchart LR
  RouteState["CanvasDraftPresentationState"] --> Model["canvasRecoveryBannerModel.ts"]
  Model --> ViewState["CanvasRecoveryBannerViewState"]
  ViewState --> Template["CanvasRecoveryBanner.templates.tsx"]
  Template --> Banner["governed recovery banner"]
```

### Draft access posture

```mermaid
flowchart TD
  DraftRead["WorkspaceGraphDraftReadResponse"]
  Auth["transport auth result"]
  Session["CanvasDraftSession recovery"]
  Posture["canvasDraftAccessPostureModel.ts"]
  Toolbar["toolbar draft label"]
  Banner["actionable recovery banner"]
  Surface["center blocker or error"]
  Interactions["effective permissions"]

  DraftRead --> Posture
  Auth --> Posture
  Session --> Posture
  Posture --> Toolbar
  Posture --> Banner
  Posture --> Surface
  Posture --> Interactions
```

## Consumers

Direct consumers:

- `Root.tsx`
- graph-adjacent route bootstrap modules
- `workspaceService.api.ts`
- `workspaceGraphDraftAuthoring.api.ts`
- `canvasDraftRepository.ts`
- `canvasCreateCanvasDocumentCommand.ts`
- `CanvasPlaygroundHost.tsx`
- `CanvasShell.tsx`
- `CanvasShellMainPanel.tsx`
- `CanvasRecoveryBanner.tsx`
- `CanvasViewport.tsx`
- `DbtNodeComponent.tsx`

Indirect consumers:

- Canvas route state tests and bootstrap flow tests
- `WorkspaceGraphSnapshot` route readers
- route shell composition
- plugin-rendered Canvas nodes through the DVT node shell

## User-Story Traceability

The component owns the Canvas scenarios below. Branch-adjacent engine,
traceability, and adapter scenarios are recorded in the Fowler mailbox review
because they belong to separate component owners.

| Story group          | Local stories                                                     | Governing invariant                                                            |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Startup gate         | `US-CANVAS-BOOTSTRAP-001` through `US-CANVAS-BOOTSTRAP-004`       | Route posture decides whether the shell reveals a governed surface.            |
| Protected auth       | `US-CANVAS-AUTH-001` through `US-CANVAS-AUTH-002`                 | API transport refreshes stale local auth before route recovery is shown.       |
| Protected draft      | `US-CANVAS-DRAFT-001` through `US-CANVAS-DRAFT-006`               | Canvas reads and writes the protected draft authority with explicit CAS rules. |
| Draft access posture | `US-CANVAS-DRAFT-007` through `US-CANVAS-DRAFT-011`               | Canvas distinguishes session, scope, read-only, format, and recovery states.   |
| Layout persistence   | `US-CANVAS-LAYOUT-001` through `US-CANVAS-LAYOUT-003`             | Viewport coordinates remain route-local and separate from draft authority.     |
| Presentation         | `US-CANVAS-PRESENTATION-001` through `US-CANVAS-PRESENTATION-003` | JSX templates render resolved view state and do not own command policy.        |
| Architecture guard   | `US-CANVAS-ARCH-001`                                              | Tests validate semantic promises and documentation traceability.               |

```mermaid
flowchart LR
  Stories["Canvas user stories"] --> Guide["Component guide"]
  Stories --> Guard["Semantic architecture guard"]
  Guard --> API["Public API and invariants"]
  Guard --> Templates["Passive templates"]
  Guard --> Projection["Protected draft projection"]
  Guard --> Commands["Create/replace command policy"]
```

## Fowler reading

| Pattern                       | Local expression                             | Maturity rule                                      |
| ----------------------------- | -------------------------------------------- | -------------------------------------------------- |
| Application Controller        | route bootstrap presentation factories       | separate route operability from process startup    |
| Gateway                       | `workspaceGraphDraftHttp.ts`                 | one protected endpoint and scope vocabulary        |
| Projection Layer              | `workspaceGraphDraftProjection.ts`           | canonical route semantics stay separate            |
| Projection Layer              | `workspaceGraphDraftSnapshotProjection.ts`   | DBT-shaped snapshots stay adapter/read-model local |
| Command                       | `CanvasCreateCanvasDocumentCommand`          | destructive recovery is explicit and guarded       |
| Policy Object                 | `canvasCreateCanvasDocumentCommandPolicy.ts` | create/replace CAS rules are testable without UI   |
| Domain Event Handler          | `canvasCreateCanvasDocumentSaveResult.ts`    | save outcomes update session state in one place    |
| Decision Table                | `DBT_NODE_TYPE_RULES`                        | projection policy is data-driven and extensible    |
| Presentation Template         | `CanvasPlaygroundHostTemplate`               | render host selection HTML without command DTOs    |
| Presentation Model            | `CanvasRecoveryBannerViewState`              | reduce recovery reasons to renderable state        |
| Presentation Template         | `CanvasRecoveryBannerTemplate`               | render recovery HTML without route state imports   |
| Presentation Model            | `CanvasDraftAccessPosture`                   | keep draft access truth in one posture object      |
| Policy Object                 | `isCanvasDraftPostureMutationBlocked`        | gate unsafe mutations from one semantic policy     |
| Intention Revealing Interface | whole node drag surface                      | gesture ownership is named and testable            |
| Parameter Object              | `MapCanonicalNodeToCanvasNodeArgs`           | viewport projection options are named at callsite  |

## Negative coverage

The local architecture guard is:

- `apps/web/src/app/views/canvas/canvasStartupBootstrapPublication.architecture.test.ts`
- `apps/web/src/app/views/canvas/canvasDraftRecoveryBoundary.architecture.test.ts`
- `apps/web/src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts`
- `apps/web/src/app/services/workspace/workspaceGraphDraftFixtureBoundaries.architecture.test.ts`

It validates semantics, not only barrel thinness:

- `failed` posture can complete bootstrap;
- protected draft endpoint and scoped URL are canonical;
- workspace graph draft test fixtures are split by authoring, protected
  protocol, and expected projection concerns;
- replacement requires `replace_current` and uses current revision CAS;
- replacement eligibility, draft input construction, save success, and save
  conflict are held behind named semantic helpers outside the command
  orchestrator;
- DBT node-type projection lives in `workspaceGraphDraftSnapshotProjection.ts`
  and uses `DBT_NODE_TYPE_RULES` plus a matcher instead of hidden branch
  chains;
- canonical-node viewport projection uses `MapCanonicalNodeToCanvasNodeArgs`
  instead of a positional argument train;
- host rendering and replacement command routing stay behind host-owned
  template and command seams without reintroducing route-mode tabs;
- `CanvasPlaygroundHost.tsx` builds create-canvas commands while
  `CanvasPlaygroundHost.templates.tsx` owns host HTML;
- `CanvasRecoveryBanner.tsx` delegates recovery state resolution and renders
  through `CanvasRecoveryBanner.templates.tsx`;
- replacement confirmation stays tied to edit permission;
- mapped and dropped nodes do not carry a React Flow `dragHandle` selector;
- branch-owned modules keep owned-concern docblocks;
- protected-runtime auth refresh stays inside the API client component;
- Canvas layout persistence does not import draft-authoring ports;
- this guide and the Fowler mailbox remain present and aligned.

## Drift to watch

- Do not show draft-denial recovery for an expired local token before the API
  client has attempted a bounded refresh.
- Do not persist Canvas layout by writing the protected graph draft.
- Do not add a second graph snapshot endpoint as a startup workaround.
- Do not let `failed` route posture absorb startup contract errors.
- Do not add local storage or database cleanup as a replacement path.
- Do not enable node drag by CSS class while `CanvasViewport` denies mutation.
- Do not present the replacement button as multi-canvas creation until the
  backend has a multi-canvas aggregate.

<a id="section-canvas-startup-and-draft-recovery-user-stories"></a>

## Canvas Startup And Draft Recovery User Stories

### Purpose

This document captures the user-facing and architecture-facing scenarios
covered by the Canvas startup and draft-recovery component after the static
analysis follow-up branch.

It complements the component guide:

- [Canvas Startup And Draft Recovery Component](canvas-startup-and-draft-recovery-component.md)

### User Stories

#### US-CANVAS-BOOTSTRAP-001: reveal a governed route failure

As an operator opening Canvas, I want the startup gate to complete when Canvas
can render a governed route-local failure, so I see the real recovery surface
instead of a startup card that hides the app.

Acceptance criteria:

- Given the route publishes `failed`, when the bootstrap gate evaluates route
  readiness, then it completes only when the failure is governed.
- Given the route publishes `error`, when the bootstrap gate evaluates startup,
  then it keeps the startup failure posture.
- Given the route can render a blocker, then the shell does not reveal unsafe
  editing controls.

#### US-CANVAS-BOOTSTRAP-002: keep health failures visible but non-blocking when safe

As an operator, I want platform health failures to be visible without freezing
Canvas when the route has a safe first surface, so I understand the problem and
can still inspect recovery state.

Acceptance criteria:

- Health transport failures publish failed health detail.
- The shell completes when the active route publishes a governed failure or
  blocker.
- The route owns backend-readiness interaction safety.

#### US-CANVAS-BOOTSTRAP-003: load runtime capabilities before unsafe work

As an operator, I want runtime capabilities to settle before Canvas enables
actions, so unavailable features cannot be invoked by accident.

Acceptance criteria:

- Capabilities can be pending, ready, or fallback.
- Fallback capability state is visible.
- Canvas action enablement is derived from route and capability posture, not
  from template-level checks.

#### US-CANVAS-BOOTSTRAP-004: preserve localized bootstrap and route copy

As a Spanish-language operator, I want startup and recovery text to resolve
from locale catalogs, so the UI does not mix hardcoded English with Spanish
route state.

Acceptance criteria:

- Bootstrap publishers use command factories and copy catalogs.
- Canvas presenters resolve copy before rendering templates.
- Passive templates do not import copy catalogs.

#### US-CANVAS-AUTH-001: refresh an expired local protected-runtime token

As an operator using a long-lived local Canvas session, I want protected draft
requests to use a fresh local dev-stack token, so the app does not present a
false draft-denied state after an overnight token expiry.

Acceptance criteria:

- The frontend omits an expired configured bearer token when no refresh URL is
  available.
- When `VITE_API_BEARER_TOKEN_REFRESH_URL` exists, the API auth component
  requests a fresh token before a protected runtime call.
- Canvas route code does not decode JWTs or call the refresh endpoint directly.

#### US-CANVAS-AUTH-002: retry one safe protected request after 401

As an operator whose local token expires between request preparation and API
handling, I want the transport to refresh and retry once, so a recoverable
auth race does not block Canvas startup.

Acceptance criteria:

- `createApiClient()` retries one `401` only when a refresh URL is available.
- Retry is limited to absent or string-backed request bodies.
- The retried request keeps session headers and normalized transport error
  handling.

#### US-CANVAS-DRAFT-001: read the protected workspace draft

As an operator opening Canvas, I want the route to read the protected workspace
draft, so Canvas reflects the authoritative draft state.

Acceptance criteria:

- API-mode graph reads use `/workspace/graph/draft`.
- Tenant, project, and environment are always present in the scoped endpoint.
- The route does not call a second graph authority endpoint.

#### US-CANVAS-DRAFT-002: project semantic graph truth before viewport rendering

As a developer extending Canvas, I want protected draft data projected into a
canonical semantic graph before DBT-shaped read models or React Flow nodes are
created, so the domain meaning is not coupled to one renderer.

Acceptance criteria:

- `workspaceGraphDraftProjection.ts` owns route-facing draft and canonical
  graph projection.
- `workspaceGraphDraftSnapshotProjection.ts` owns DBT-shaped snapshot output.
- DBT node-type mapping remains a rule table plus matcher.

#### US-CANVAS-DRAFT-003: create the first canvas only when no draft exists

As an operator in an empty workspace, I want to create the first Canvas
document only when no authoritative draft exists, so I do not erase work that
already exists remotely.

Acceptance criteria:

- `create_first` fails closed when a draft record exists.
- The command policy owns create-first eligibility.
- The host constructs the create command; templates only render choices.

#### US-CANVAS-DRAFT-004: replace the current canvas explicitly

As an operator, I want replacement of the current Canvas to require an explicit
confirmation, so destructive recovery cannot happen by selecting a tab.

Acceptance criteria:

- Replacement uses command mode `replace_current`.
- Replacement stays disabled when effective permissions deny editing.
- The tab-strip presenter dispatches the command only after confirmation.

#### US-CANVAS-DRAFT-005: preserve CAS safety during replacement

As an operator, I want replacement to use the current draft revision, so remote
changes are not overwritten silently.

Acceptance criteria:

- `replace_current` fails closed when there is no remote draft.
- Replacement saves a blank draft with `expectedRevision` from the current
  record.
- Save conflict applies remote truth to cache and session state.

#### US-CANVAS-DRAFT-006: keep recovery state visible after drift or conflict

As an operator, I want stale, missing, denied, or malformed draft states to
render as governed recovery surfaces, so Canvas explains why editing is not
available.

Acceptance criteria:

- Recovery banner state is resolved in `canvasRecoveryBannerModel.ts`.
- Recovery HTML is rendered in `CanvasRecoveryBanner.templates.tsx`.
- Recovery templates do not import route presentation state or copy catalogs.

#### US-CANVAS-DRAFT-007: distinguish missing session from forbidden scope

As an operator, I want Canvas to distinguish an expired or missing session from
a real forbidden workspace scope, so I know whether to refresh session state or
change permissions.

Acceptance criteria:

- A protected draft read with capability reason `unauthenticated` renders a
  session-required posture.
- A protected draft read with capability reason `workspace_scope_denied` or
  `tenant_mismatch` renders a forbidden-scope posture.
- The toolbar does not render the synced label in either posture.
- Graph edit, plan, and run actions are disabled in both postures.
- The recovery action for session denial is not the same as the action for
  forbidden scope.

#### US-CANVAS-DRAFT-008: keep read-only draft access inspectable

As a reviewer with read-only draft access, I want the Canvas graph to stay
inspectable while writes are blocked, so I can review graph content without
being offered unsafe mutation controls.

Acceptance criteria:

- Draft capability mode `read_only` does not render a forbidden center-surface
  error.
- The viewport remains visible when a graph can be projected.
- Graph edits, plan, and run start remain disabled for read-only posture.
- The toolbar says read-only rather than synced.
- Read-only copy comes from Canvas copy catalogs.

#### US-CANVAS-DRAFT-009: keep governed format failures separate from auth denial

As an operator, I want stored draft format failures to render as contract
problems, so I do not retry session or permission flows for corrupt or
unsupported data.

Acceptance criteria:

- Unsupported schema and corrupt payload render format
  failure posture.
- Format failure does not render session-required or forbidden-scope copy.
- Format failure disables unsafe mutations.
- Format failure remains a center-surface error rather than a reload-only
  recovery banner.

#### US-CANVAS-DRAFT-010: resolve toolbar, banner, permissions, and bootstrap from one posture

As an architect, I want draft access posture to be resolved once, so route
surfaces cannot drift into contradictory states.

Acceptance criteria:

- `canvasDraftAccessPostureModel.ts` owns the posture discriminator.
- `canvasDraftAuthTransportPosture.ts` owns normalized final `401` transport
  input and does not inspect API tokens or refresh configuration.
- Toolbar label, recovery banner state, center-surface transport state, and
  mutation gating consume `CanvasDraftAccessPosture`.
- Runtime command admission for graph edit, draft save, plan, and run consumes
  `CanvasDraftAccessPosture`.
- Recovery action callbacks are resolved outside JSX templates.
- Route components do not decode JWTs or call token refresh endpoints.
- Architecture tests reject duplicated local `forbidden` and `read_only`
  branches outside the posture model.

#### US-CANVAS-DRAFT-011: prove denial and read-only posture in Cypress

As a product owner, I want browser tests for denied and read-only draft posture,
so the user-visible product behavior is protected beyond unit tests.

Acceptance criteria:

- Cypress proves session-required draft denial hides synced copy and disables
  unsafe actions.
- Cypress proves forbidden-scope draft denial hides synced copy and gives a
  scope-oriented recovery action.
- Cypress proves read-only draft access keeps inspection visible and disables
  mutation controls.
- Cypress does not rely on uncontrolled token expiry timing.

#### US-CANVAS-FIRST-AUTHORING-001: create the first shared Canvas live

As an operator in a clean workspace, I want to create the first shared Canvas
through the live protected route, so Canvas becomes useful without seed data or
hidden setup.

Acceptance criteria:

- A protected empty draft renders the typed create-canvas entrypoint.
- The canvas surface renders no seeded project nodes before creation.
- The single offered Canvas entry sends `CreateCanvas` through the existing
  command path using the internal `transformation` runtime registration.
- The empty Canvas is saved with `SaveWorkspaceGraphDraft`.
- The first node is created from `dvt:transform` and resolves to
  `dvt-transform-1` / `Transform 1`.
- Cypress proves the flow without intercepting draft read or write endpoints.
- Cypress fails fast when the test-owned live workspace already contains a
  draft instead of overwriting that draft directly.

#### US-CANVAS-FIRST-AUTHORING-002: reject a retired Canvas kind

As an operator opening a persisted document with a retired Canvas kind, I want
the route to fail closed, so unsupported topology is never silently treated as
the shared Canvas runtime.

Acceptance criteria:

- A persisted `dbt` Canvas kind has no runtime registration.
- The route reports the unsupported kind and disables unsafe commands.
- No alias converts the retired kind into `transformation`.
- dbt authority and provenance may survive as profile data without selecting a
  second Canvas runtime.

#### US-CANVAS-FIRST-AUTHORING-003: add the first node after authoritative save

As an operator, I want the first node action to become available only after the
first canvas has been saved, so node creation cannot race an unsaved document.

Acceptance criteria:

- `CreateCanvasNode` stays disabled while first-canvas save is pending.
- `CreateCanvasNode` requires writable `CanvasDraftAccessPosture`.
- The created node is persisted through `SaveWorkspaceGraphDraft`.
- Reloaded protected draft truth contains the created node.

#### US-CANVAS-FIRST-AUTHORING-004: persist first-node drag from the node card

As an operator moving the first node, I want Canvas to persist the dropped
coordinate when I grab the node card itself, so the product matches the natural
graph-editing gesture.

Acceptance criteria:

- Dragging from the node card body counts as first-authoring proof.
- Dragging uses the drag-stop payload coordinate.
- The whole node card is the React Flow drag surface when mutation is allowed.
- `PersistCanvasLayout` writes only route-local layout projection data.
- `GetCanvasLayout` restores the coordinate after reload.

#### US-CANVAS-FIRST-AUTHORING-005: restore the first authored canvas after reload

As an operator, I want the first authored canvas and first node to reload in
the same place, so I can trust Canvas persistence before preview or run work.

Acceptance criteria:

- Hard reload performs a live `GetWorkspaceGraphDraft` query.
- Cypress does not intercept draft read or write endpoints.
- Cypress does not issue `PUT /workspace/graph/draft` before the UI
  `CreateCanvas` path runs.
- The restored route shows the created canvas and node.
- The restored node uses the route-local persisted coordinate.
- The proof is complete only when authoritative draft and layout restore agree.

#### US-CANVAS-FIRST-AUTHORING-006: block first authoring when draft access is unsafe

As an operator without writable draft access, I want first-authoring actions to
be unavailable, so Canvas does not imply that edits can be saved.

Acceptance criteria:

- Read-only, unauthenticated, forbidden-scope, pending, and format-error
  postures disable first-canvas and first-node commands.
- The route displays the governed recovery posture from
  `CanvasDraftAccessPosture`.
- No first-authoring proof state can be complete while draft posture is not
  writable.

#### US-CANVAS-FIRST-AUTHORING-007: create Canvas inside the active workspace

As an operator in an empty workspace, I want Canvas to show the active
workspace before I create the shared Canvas, so I understand where the document
will be created.

Acceptance criteria:

- The shell shows Project and Environment; the first-canvas host does not repeat
  raw scope IDs or the runtime adapter.
- The startup copy presents one Canvas creation choice.
- The host renders one Start canvas action, without a Canvas type or template.
- Starting Canvas dispatches `CreateCanvasDocumentCommand` through
  the existing protected draft command rail.
- The passive host template does not import copy catalogs or command DTOs.
- No new workspace or project selector is introduced in this route slice.

#### US-CANVAS-LAYOUT-001: persist drag-stop payload coordinates

As an operator moving a Canvas card, I want the dropped coordinate to persist,
so the card does not snap back after React Flow supplies a stale node array.

Acceptance criteria:

- `handleNodeDragStop` merges the `draggedNode` event payload over `allNodes`.
- The persisted map contains every visible node position.
- The persistence path writes route-local layout state, not protected draft
  graph state.

#### US-CANVAS-LAYOUT-002: persist settled live drag positions

As an operator completing a drag gesture, I want Canvas to persist the settled
live viewport position, so the layout survives re-render and route reload.

Acceptance criteria:

- Active drag frames do not write persisted positions.
- A settled observed drag frame writes changed node positions.
- Equal persisted positions are not rewritten.

#### US-CANVAS-LAYOUT-003: block layout writes before route readiness

As a maintainer, I want Canvas layout persistence disabled before hydration and
graph-query readiness, so bootstrap and stale graph state cannot overwrite the
operator layout.

Acceptance criteria:

- Node positions are not persisted while graph query is pending.
- Viewport state is not persisted while graph query is pending.
- Hydration state gates layout persistence.

#### US-CANVAS-PRESENTATION-001: keep first-canvas HTML passive

As a frontend maintainer, I want first-canvas HTML in a passive template, so
command construction stays testable outside JSX.

Acceptance criteria:

- `CanvasPlaygroundHost.tsx` owns command construction.
- `CanvasPlaygroundHost.templates.tsx` renders choices from copy and kind
  registrations.
- The template does not import command DTO types.

#### US-CANVAS-PRESENTATION-002: keep graph-first shell HTML passive

As a frontend maintainer, I want graph-first shell HTML to render only resolved
view state, so replacement policy, i18n, and command dispatch do not recombine
in route templates.

Acceptance criteria:

- `CanvasShell.tsx` remains the graph-first shell mount.
- shell builders coordinate command wiring and resolved copy outside templates.
- shell presentation does not reintroduce fixed route-mode tabs.

#### US-CANVAS-PRESENTATION-003: keep node drag gesture ownership explicit

As an operator, I want Canvas cards to drag from the whole node body while ports
keep their own connection behavior, so moving a node does not depend on a tiny
grip target.

Acceptance criteria:

- Mapped and dropped nodes omit a React Flow `dragHandle` selector.
- `GraphNodeRenderer.tsx` does not render a separate grip-only drag handle.
- Drag enablement remains governed by `CanvasViewport` permissions.

#### US-CANVAS-ARCH-001: validate semantics, not only barrels

As an architect, I want an architecture test that validates route posture,
protected endpoint, CAS policy, passive templates, i18n boundaries, owned
concerns, and documentation traceability, so the branch promises remain
enforced.

Acceptance criteria:

- Architecture tests read the local component guide and this story document.
- Tests check semantic strings such as `/workspace/graph/draft`,
  `replace_current`, and `dragSourceNodeFromCardBody`.
- Tests reject retired-route shims and duplicated authority paths.

#### US-CANVAS-ARCH-002: keep workspace draft test fixtures bounded

As a frontend maintainer, I want workspace graph draft fixtures split by
authoring shape, protected protocol envelope, and expected projection output,
so tests do not depend on a broad helper module that mixes unrelated concerns.

Acceptance criteria:

- Authoring draft tests import authoring fixtures.
- Protected read/save tests import protocol envelope fixtures.
- Projection tests import expected projection fixtures.
- Endpoint assertions import the production workspace graph draft HTTP
  boundary.

### Scenario Coverage Matrix

| Story                         | Scenario                                        | Primary implementation                                                         | Primary tests                                                                                                                                                   |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-CANVAS-BOOTSTRAP-001       | Governed route failure can reveal route surface | `routeBootstrapContract.ts`                                                    | `canvasStartupBootstrapPublication.architecture.test.ts`, `Root.bootstrapFlow.test.tsx`                                                                         |
| US-CANVAS-BOOTSTRAP-002       | Health failure is visible and route-safe        | `appBootstrapPresentation.ts`, `Root.tsx`                                      | `appBootstrapPresentation.test.ts`, `Root.bootstrapFlow.test.tsx`                                                                                               |
| US-CANVAS-BOOTSTRAP-003       | Capabilities settle before unsafe actions       | `Root.tsx`, capability query policy                                            | `Root.bootstrapFlow.test.tsx`, `queryKeyPolicy.architecture.test.ts`                                                                                            |
| US-CANVAS-BOOTSTRAP-004       | Locale-backed startup and route copy            | `appBootstrapCopy.ts`, `copy/*`                                                | `appBootstrapCommands.test.ts`, `copy.test.ts`                                                                                                                  |
| US-CANVAS-AUTH-001            | Refresh expired local protected token           | `apiAuthConfig.ts`, `scripts/run-dev-stack.auth.cjs`                           | `createApiClient.test.ts`, `run-dev-stack.auth.test.cjs`                                                                                                        |
| US-CANVAS-AUTH-002            | Retry one safe protected request after `401`    | `createApiClient.ts`                                                           | `createApiClient.test.ts`, `canvasDraftRecoveryBoundary.architecture.test.ts`                                                                                   |
| US-CANVAS-DRAFT-001           | Protected draft endpoint                        | `workspaceGraphDraftHttp.ts`                                                   | `canvasStartupBootstrapPublication.architecture.test.ts`                                                                                                        |
| US-CANVAS-DRAFT-002           | Semantic and DBT snapshot projection split      | `workspaceGraphDraftProjection.ts`, `workspaceGraphDraftSnapshotProjection.ts` | `workspaceGraphDraftSnapshotProjection.test.ts`                                                                                                                 |
| US-CANVAS-DRAFT-003           | Create first Canvas only when empty             | `canvasCreateCanvasDocumentCommandPolicy.ts`                                   | `canvasCreateCanvasDocumentCommand.test.ts`                                                                                                                     |
| US-CANVAS-DRAFT-004           | Confirmed replacement command                   | `canvasCreateCanvasDocumentCommand.ts`                                         | `canvasCreateCanvasDocumentCommand.test.ts`                                                                                                                     |
| US-CANVAS-DRAFT-005           | CAS-protected replacement                       | `canvasCreateCanvasDocumentCommandPolicy.ts`                                   | `canvasCreateCanvasDocumentCommand.test.ts`                                                                                                                     |
| US-CANVAS-DRAFT-006           | Recovery banner surfaces                        | `canvasRecoveryBannerModel.ts`, `CanvasRecoveryBanner.templates.tsx`           | `canvasDraftRecoveryBoundary.architecture.test.ts`                                                                                                              |
| US-CANVAS-DRAFT-007           | Session denial versus forbidden scope           | `canvasDraftAccessPostureModel.ts`                                             | `canvasDraftAccessPostureModel.test.ts`, Cypress draft access posture spec                                                                                      |
| US-CANVAS-DRAFT-008           | Read-only draft inspection posture              | `canvasDraftAccessPostureModel.ts`, `canvasRouteInteractionState.ts`           | `canvasDraftAccessPostureModel.test.ts`, read-only route tests, Cypress spec                                                                                    |
| US-CANVAS-DRAFT-009           | Format failures stay separate                   | `canvasDraftAccessPostureModel.ts`, `canvasDraftTransportErrorState.ts`        | `canvasDraftAccessPostureModel.test.ts`, architecture guard                                                                                                     |
| US-CANVAS-DRAFT-010           | Single posture controls route surfaces          | auth posture, route state, authoring state, toolbar, banner models             | auth posture test, authoring state test, architecture guard                                                                                                     |
| US-CANVAS-DRAFT-011           | Browser proof for denied and read-only posture  | Cypress draft access spec                                                      | Cypress draft access posture spec                                                                                                                               |
| US-CANVAS-FIRST-AUTHORING-001 | Live shared first Canvas                        | `canvasFirstAuthoringLiveProof.ts`, `canvasCreateCanvasDocumentCommand.ts`     | proof test, create-canvas command test, Cypress live first-authoring spec                                                                                       |
| US-CANVAS-FIRST-AUTHORING-002 | Retired Canvas kind fails closed                | `canvasActiveGraphStrategy.ts`, `canvasRouteInteractionState.ts`               | graph-strategy test, route interaction test, route presentation test                                                                                            |
| US-CANVAS-FIRST-AUTHORING-003 | First node after authoritative save             | `useCanvasController.ts`, `useCanvasNodeAuthoringHandlers.ts`                  | controller core test, first-authoring proof test                                                                                                                |
| US-CANVAS-FIRST-AUTHORING-004 | First-node card-body layout persistence         | `canvasNodeMapper.ts`, `GraphNodeRenderer.tsx`, layout persistence             | layout tests, viewport drag-surface test, Cypress live first-authoring spec                                                                                     |
| US-CANVAS-FIRST-AUTHORING-005 | Reload restores first authored canvas           | protected draft query and layout projection                                    | controller persistence test, viewport graph model test, Cypress live proof                                                                                      |
| US-CANVAS-FIRST-AUTHORING-006 | Unsafe draft access blocks first authoring      | `CanvasDraftAccessPosture`, first-authoring proof model                        | draft access posture tests, first-authoring proof negative tests                                                                                                |
| US-CANVAS-FIRST-AUTHORING-007 | Canvas creation inside active workspace         | `CanvasPlaygroundHost`, `CanvasPlaygroundHost.templates.tsx`                   | `CanvasPlaygroundHost.test.tsx`, `CanvasPlaygroundHost.architecture.test.tsx`                                                                                   |
| US-CANVAS-LAYOUT-001          | Drag-stop payload coordinates persist           | `useCanvasLayoutPersistence.ts`                                                | `useCanvasController.persistence.test.tsx`                                                                                                                      |
| US-CANVAS-LAYOUT-002          | Settled live drag positions persist             | `useCanvasLayoutPersistence.ts`, `useCanvasViewportGraphModel.ts`              | `useCanvasController.persistence.test.tsx`, `useCanvasViewportGraphModel.layout.test.tsx`                                                                       |
| US-CANVAS-LAYOUT-003          | Pending route state blocks layout writes        | `useCanvasLayoutPersistence.ts`                                                | `useCanvasController.persistence.test.tsx`                                                                                                                      |
| US-CANVAS-PRESENTATION-001    | Passive host template                           | `CanvasPlaygroundHost.templates.tsx`                                           | `canvasDraftRecoveryBoundary.architecture.test.ts`                                                                                                              |
| US-CANVAS-PRESENTATION-002    | Passive graph-first shell                       | `CanvasShell.tsx`, shell builders                                              | `CanvasShell.architecture.test.tsx`, `canvasRoutePosturePriority.architecture.test.ts`                                                                          |
| US-CANVAS-PRESENTATION-003    | Drag surface is explicit                        | `canvasNodeMapper.ts`, `GraphNodeRenderer.tsx`                                 | `canvasStartupBootstrapPublication.architecture.test.ts`                                                                                                        |
| US-CANVAS-ARCH-001            | Semantic architecture guard                     | split Canvas architecture tests                                                | `canvasStartupBootstrapPublication.architecture.test.ts`, `canvasDraftRecoveryBoundary.architecture.test.ts`, `canvasRoutePosturePriority.architecture.test.ts` |
| US-CANVAS-ARCH-002            | Fixture boundaries                              | `workspaceGraphDraftFixtureBoundaries.architecture.test.ts`                    | `workspaceGraphDraftFixtureBoundaries.architecture.test.ts`                                                                                                     |

### TDD Traceability

```mermaid
flowchart LR
  Stories["User stories"] --> Guard["Semantic architecture test"]
  Guard --> Docs["Component guide and mailbox review"]
  Guard --> Code["Canvas startup/draft modules"]
  Code --> Tests["Targeted unit and route tests"]
  Tests --> Prepush["verify:prepush gate"]
```

Red case for this follow-up:

- the architecture guard expected the branch-level Fowler review and
  user-story guide;
- the files did not exist;
- the targeted test failed with `ENOENT`.

Green case for this follow-up:

- add the review and stories;
- link the stories from the component guide;
- rerun the architecture guard and broader validation.

Red case for the 2026-04-29 Canvas operability auth/layout follow-up:

- the architecture guard expected local auth and layout component guides plus
  a new Fowler mailbox review;
- those files did not exist;
- `apiAuthConfig.ts` and new layout/lifecycle participants did not yet satisfy
  the short owned-concern docblock guard.

Green case for the 2026-04-29 Canvas operability auth/layout follow-up:

- add the auth and layout component guides;
- add the mailbox review;
- normalize owned-concern docblocks;
- split layout persistence into named local persistence roles;
- rerun the architecture guard and targeted behavior tests.

Red case for `TF-E2-M-C` first-authoring mechanization:

- `node scripts/check-feature-mechanization.cjs --feature TF-E2-M-C` reported
  that no feature mechanization manifest existed;
- no local component guide named the first-authoring proof API, invariants,
  transitions, or consumers;
- the story catalog did not cover first-Canvas creation, first-node creation,
  drag-surface persistence, reload restore, and unsafe posture denial as one
  feature lane.

Green case for `TF-E2-M-C` planning:

- add the feature mechanization manifest and package script;
- add the first-authoring live proof component guide;
- add the user stories and scenario matrix rows;
- regenerate governed docs and run the feature mechanization checks.

Red case for `F-15-E` startup template selection:

- the first-canvas host test expected active workspace context and template
  titles from `CanvasTemplatePresentation`;
- the architecture guard expected the new component guide, mailbox review,
  user story, and semantic copy checks;
- the route still rendered registry labels and no workspace context.

Green case for `F-15-E` startup template selection:

- carry `WorkspaceScope` from the controller view model to the host template;
- render active workspace context and canvas template copy;
- keep command construction host-owned and template HTML passive;
- run the focused host tests, Canvas lane, docs sync, feature mechanization,
  and pre-push validation.

### Branch-Adjacent Scenario Notes

The same branch also hardened nearby non-Canvas scenarios:

- run execution context admission uses a named request object so engine policy
  callers cannot swap positional values;
- traceability compiled-code-ref extraction uses named payload candidates so
  lineage mapping order is visible;
- Temporal adapter activity setup uses named setup options so tests communicate
  intent.

Those scenarios are documented in the branch Fowler review because they belong
to engine, traceability, and adapter component guides rather than this Canvas
local guide.

> Acceptance scope status: Active. Owner: Frontend / Architecture.

<a id="section-canvas-playground-host-component"></a>

## Canvas Playground Host Component

### Purpose

This document defines the host layer that sits above the Canvas route.

Use it for:

- the `workspace -> playground -> canvas document` boundary
- the host-owned create-canvas flow
- the typed first-canvas posture for `dbt` and `transformation`

Do not use this page as the full `TF-E2` roadmap or as the draft aggregate
spec.

### Governing sources

- [Workspace authoring draft aggregate](../../../planner/workspace-authoring-draft-aggregate.md)
- [Canvas Route Composition Component](graph-frontend-architecture.md#section-canvas-route-composition-component)
- [Canvas Empty Authoring Entrypoint Component](canvas-empty-authoring-entrypoint-component.md)
- [Canvas Shell Component](canvas-shell-component.md)
- [Canvas Startup Template Selection Component](canvas-startup-and-draft-recovery-component.md#section-canvas-startup-template-selection-component)

### Fowler reading

| Fowler concept | Owner in this slice                | Why                                                                                 |
| -------------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| Facade         | playground host seam               | one route-safe host contract over create-canvas, active document, and kind registry |
| Registry       | canvas-kind registry               | host asks for typed canvas kinds without owning plugin semantics                    |
| DTO            | `CanvasHostCycleState`             | one story-shaped cycle contract replaces broad transport-shaped setup bags          |
| View model     | host presentation model            | route JSX renders host posture without owning selection logic                       |
| Gateway        | protected workspace draft boundary | canvas document identity persists through the canonical draft contract              |

The host must not become a god component. It owns document hosting and kind
selection only. It does not own graph mutation semantics, preview logic, or
run authority.

### Scope for the current implementation slices

Current implemented target is `TF-E2-K-A` through `TF-E2-K-D`, not the whole
multi-canvas route.

That means:

- one persisted canvas document per workspace is acceptable for this hito
- the canvas document must carry an explicit `kind`
- the host must expose a real create-canvas flow before `Add first node`
- the host must expose explicit tab chrome for the authoritative draft-backed
  canvas
- the host must derive a stable host-cycle DTO before route and workbench tests
  widen again
- multi-canvas persistence remains a later slice

This is intentional. The current protected draft contract is still one draft
record per workspace. The host must not fake multiple authoritative canvases
before that boundary exists.

### Public API

- `CanvasKindRegistration`: host-safe declaration of a canvas kind contributed
  by a plugin.
- `CanvasDocumentIdentity`: current workspace canvas title and kind.
- `CanvasPlaygroundHostState`: host posture: create-first-canvas,
  typed-empty-canvas, active-canvas.
- `CanvasHostCycleState`: story-shaped host cycle DTO: needs-canvas,
  typed-empty, graph-ready.
- `CreateCanvasDocumentCommand`: host-owned command that persists first or
  explicitly replaced canvas identity through the draft boundary.
- `CanvasPlaygroundHostTemplate`: first-canvas host template that renders
  resolved copy and canvas-kind options without building commands.
- `WorkspaceScope`: active tenant, project, environment, and adapter context
  shown before the first canvas template choice.

### Invariants

- Canvas remains a document inside the workspace, not route authority.
- The host owns create-canvas posture and current document identity.
- Plugin contributions own canvas kind semantics and node catalogs.
- The first canvas must round-trip through canonical draft persistence.
- Replacement of an existing draft-backed canvas must use `replace_current`,
  operator confirmation, and the current draft revision as CAS guard.
- The graph canvas is the base work surface; the host must not expose a
  separate tab-state seam for graph/code/log/project modes.
- The host must not invent local-only semantic success.
- The host may render one active canvas document label in this slice, but must
  not imply multi-canvas persistence that the backend does not yet support.
- Host and workbench tests must consume `CanvasHostCycleState` rather than
  reconstructing wide transport-shaped scenario bags for every cycle.
- Route test-support for host cycles must live in a dedicated scenario module;
  `Canvas.test.controller.defaults.ts` stays for generic controller defaults,
  not cycle-specific story DTOs.
- Route-level host-cycle proofs must advance from `needs_canvas` to
  `typed_empty` and then `graph_ready` through stable cycle DTO seams rather
  than bespoke controller transport bags.
- Test-support fixtures must resolve first-node kinds from the registered
  catalog for the active canvas kind; `dbt` proofs must not borrow
  transformation-only fixtures.
- On reopen, the active canvas identity and typed posture must derive from the
  authoritative draft-backed `canvasDocument`; ambient controller mode must not
  override restore posture.
- Restored typed-empty posture renders the authoritative canvas shell directly;
  it must not cover the viewport with a passive onboarding overlay.
- First-canvas host HTML belongs in `CanvasPlaygroundHost.templates.tsx`.
  `CanvasPlaygroundHost.tsx` owns copy selection and create-canvas command
  construction.
- Host templates must not construct `CanvasCreateCanvasDocumentCommand` DTOs.
- First-canvas startup offers one Start canvas action. Project and environment
  context remain visible in the shell; the host does not repeat scope IDs or
  adapter details. No canvas template or type is a user-facing choice.

### Transitions

```mermaid
stateDiagram-v2
  [*] --> HostNeedsCanvas
  HostNeedsCanvas --> CreatingCanvas: start Canvas
  CreatingCanvas --> DraftBackedCanvas: saved empty draft with canvas identity
  DraftBackedCanvas --> TypedEmptyCanvas: restore canvas identity from workspace draft
  TypedEmptyCanvas --> ActiveCanvas: first node persisted
  ActiveCanvas --> ActiveCanvas: edit graph
  ActiveCanvas --> ConfirmingReplacement: New canvas
  ConfirmingReplacement --> DraftBackedCanvas: replace_current saved through CAS
```

### Component ownership

```mermaid
flowchart LR
  Route["Canvas route"]
  Host["Playground host"]
  HostTemplate["Playground host template"]
  Cycle["CanvasHostCycleState"]
  Registry["Canvas kind registry"]
  Empty["Typed empty canvas"]
  Shell["Existing Canvas shell"]
  Draft["Protected workspace draft boundary"]

  Route --> Host
  Host --> HostTemplate
  Host --> Cycle
  Host --> Registry
  Cycle --> Empty
  Cycle --> Shell
  Host --> Draft
  Draft --> Cycle
  Empty --> Draft
  Shell --> Draft
```

### Sequence

```mermaid
sequenceDiagram
  participant User as Operator
  participant Host as Playground host
  participant Registry as Canvas kind registry
  participant Draft as Protected draft boundary
  participant Shell as Canvas shell

  User->>Host: open workspace canvas route
  Host->>Draft: read workspace draft
  Draft-->>Host: empty draft without canvas identity
  Host->>Registry: request available kinds
  Registry-->>Host: dbt, transformation
  User->>Host: create canvas(kind)
  Host->>Draft: save empty draft with canvas identity
  Draft-->>Host: saved
  Host->>Shell: derive active workspace-draft canvas
  Host->>Shell: render typed empty canvas
  User->>Shell: add first node from typed catalog
  Shell->>Draft: persist first authoring node through draft lifecycle
  Draft-->>Host: graph-backed canvas draft
  Host->>Shell: render graph-ready canvas
  User->>Host: New canvas
  Host->>User: confirm replacement
  User->>Host: confirm
  Host->>Draft: save blank draft with expectedRevision=current
  Draft-->>Host: replacement saved or conflict posture
```

### Authoritative restore

```mermaid
sequenceDiagram
  participant User as Operator
  participant Host as Playground host
  participant Draft as Protected draft boundary
  participant Shell as Canvas shell

  User->>Host: reopen workspace
  Host->>Draft: read authoritative draft
  Draft-->>Host: canvasDocument(kind,title) plus graph truth
  Host->>Shell: derive workspace-draft canvas identity
  Host->>Shell: render typed empty overlay or graph-ready posture
  Shell-->>User: restored canvas and posture from draft truth
```

### Consumers

- `Canvas.tsx`
- route-owned Canvas host builders and view-model seams
- empty authoring entrypoint
- plugin registry helpers exposing typed canvas kinds

### Non-goals

- multiple persisted canvas documents in one workspace
- shell-owned execution selection
- plugin-owned route authority
- hidden browser-only canvas metadata

> Section status: Active. Owner: Frontend / Architecture. Colocation does not merge component responsibilities.

<a id="section-canvas-startup-template-selection-component"></a>

## Canvas Startup Template Selection Component

### Purpose

This component owns entry into the single Canvas inside the active workspace.
There are no user-facing Canvas types or template choices.

### Public API

- `CanvasPlaygroundHost`
  - consumes the existing runtime registrations and
    `onCreateCanvasDocument`.
  - owns copy selection and command construction.
- `CanvasPlaygroundHostTemplate`
  - consumes resolved copy, a creation callback and an unavailable reason.
  - renders passive HTML only.
- `CreateCanvasDocumentCommand`
  - existing command rail used to persist the first canvas document.

### Invariants

- Workspace, project, environment, and adapter are resolved before this surface
  renders.
- The shell shows the active workspace. The first-start surface must not duplicate
  raw scope IDs or adapter details.
- One direct Start canvas action replaces the former canvas template chooser.
- The host builds `CreateCanvasDocumentCommand`; the template never imports the
  command DTO or copy catalog.
- The first canvas persists through `/workspace/graph/draft`; no parallel
  startup command or fake local success path is allowed.
- First-canvas creation is a canvas-document transition. Its availability must
  follow draft persistence eligibility and must not reuse `canEditEdges`, which
  belongs to graph/node/edge mutation after a persisted document exists.
- Draft persistence eligibility is projected as `canPersistGraphDraft`; graph
  editability remains `canEditEdges`.
- The component does not introduce a workspace/project selector.

### Transitions

```mermaid
stateDiagram-v2
  [*] --> ActiveWorkspaceResolved
  ActiveWorkspaceResolved --> NeedsCanvas: protected draft has no canvas document
  NeedsCanvas --> CreatingFirstCanvas: operator starts Canvas
  CreatingFirstCanvas --> DraftBackedCanvas: CreateCanvasDocumentCommand saved
  DraftBackedCanvas --> EmptyCanvas: route projects authoritative draft
  EmptyCanvas --> GraphReady: first node is saved
```

### Component Flow

```mermaid
flowchart LR
  Scope["WorkspaceScope"]
  Copy["Canvas route copy catalog"]
  Registry["Canvas kind registry"]
  Host["CanvasPlaygroundHost"]
  Template["CanvasPlaygroundHostTemplate"]
  Command["CreateCanvasDocumentCommand"]
  Draft["Protected workspace graph draft"]

  Scope --> Host
  Copy --> Host
  Registry --> Host
  Host --> Template
  Template -->|start Canvas| Host
  Host --> Command
  Command --> Draft
```

### Sequence

```mermaid
sequenceDiagram
  participant Operator
  participant Route as Canvas route
  participant Host as CanvasPlaygroundHost
  participant Template as Host template
  participant Draft as Workspace graph draft

  Operator->>Route: Open Canvas in active workspace
  Route->>Host: workspace scope plus Canvas creation eligibility
  Host->>Template: resolved copy and creation callback
  Operator->>Template: Start canvas
  Template->>Host: invoke creation callback
  Host->>Draft: CreateCanvasDocumentCommand with Canvas title
  Draft-->>Route: authoritative draft with canvas document
```

### Consumers

- `canvasControllerViewModel.ts`
- `canvasRouteViewState.ts`
- `canvasShellPropsBuilder.tsx`
- `canvasShellLayoutBuilder.tsx`
- `CanvasCenterSurface.tsx`
- `canvasCenterSurfaceWorkbench.tsx`
- `CanvasPlaygroundHost.tsx`
- `CanvasPlaygroundHost.templates.tsx`

### Drift To Prevent

- Reintroducing project-type copy in the first-start host.
- Hiding active workspace context at the decision point.
- Letting the passive template construct commands or import copy catalogs.
- Adding a second command/query rail for the same first-canvas intent.
- Treating focus lanes or browser visual checks as replacements for the
  semantic architecture guard.

### Single Canvas first-use correction (2026-09-06)

Issue #2268 implements the one-Canvas decision #2902. There are no Canvas
types or templates in the product.
The active workspace is already visible in the shell. First use presents one
Start canvas action and a short explanation; it does not repeat raw scope IDs,
runtime adapter, persistence internals, or a one-option template chooser.

Current defect and required separation:

```mermaid
flowchart LR
  Missing[No document yet] --> Disabled[Runtime commands unavailable]
  Disabled --> Wrong[Incorrect read-only banner]
  Grants[Authorization permissions] --> Access[Access presentation]
  Draft[Protected draft access posture] --> Access
  Disabled --> Commands[Command availability only]
  Start[Start canvas] --> Rail[Existing CreateCanvasDocumentCommand]
  Rail --> CAS[Protected draft save with CAS]
```

The host remains the command owner and the template remains passive. Resolve the
shared transformation registration from the existing registry; do not introduce
a second kind or silently choose an unsupported registration. Creation still
requires its existing eligibility callback and must not occur as a read effect.
A successful save opens the existing empty Canvas. Denials and conflicts retain
their existing recovery paths.

Access presentation uses authorizationPermissions and protected draft posture,
never runtime command readiness. A missing document, unavailable execution
projection, or in-flight save cannot manufacture a permission denial. Runtime
commands remain disabled until their own policy admits them. Real write denial
continues to prevent mutation. Existing rails, scope authorization, application
ports and CAS semantics are unchanged.

The protected read result `not_found` projects an unknown draft access mode and
the `unknown_pending` posture. Its `mutationBlocked` flag prevents commands that
require a document; it does not establish an access denial. Only the `read_only`
posture overrides the authorization permissions for the read-only banner.
Transport denials and draft recovery retain their existing dedicated surfaces.

| scenario                                                      | opportunity                                                                               | Fowler pattern                                                    | DDD owner                                          | command/query rail                                  | implementation surfaces                                                                           | unit or package test                                                                                                                               | architecture test                                            | user-flow test                                                     | out of scope                                                |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| First Canvas after a protected draft read returns `not_found` | Hidden authority and test-only confidence: command unavailability was presented as denial | Presentation Model separates authorization from command admission | Canvas draft access posture and route presentation | Existing `CreateCanvasDocumentCommand`; no new rail | `canvasRouteInteractionState.ts`, its regression test, existing first-use route and Cypress tests | Derive the real `not_found` read model and posture; no false banner, creation eligible, runtime commands blocked; preserve actual read-only denial | Existing draft posture priority and recovery boundary guards | Visible first creation and reload through the protected draft save | New grants, draft admission changes, new workspace creation |

Acceptance: EN/ES direct action, no redundant scope/adapter/template explanation,
keyboard accessible native button, original command dispatch, no creation when
disallowed, no false restriction before first creation or while execution is
unavailable, and preserved actual draft write denial.

> Section status: Active. Owner: Frontend / Canvas. Colocation does not merge component responsibilities.
