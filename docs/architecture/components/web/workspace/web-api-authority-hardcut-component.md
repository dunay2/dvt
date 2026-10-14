---
title: Web API Authority Hardcut Component
status: Implemented
owner: Web / API / Architecture
last_reviewed: 2026-05-10
planning_type: architecture
---

# Web API Authority Hardcut Component

## Purpose

The component makes browser-local authorization and capability state a
server-projected cache, not an authority source.

## Public API

| Surface                       | Kind                           | Owner                           | Consumers                                  |
| ----------------------------- | ------------------------------ | ------------------------------- | ------------------------------------------ |
| `DEFAULT_USER_PERMISSIONS`    | fail-closed value object       | Web authorization projection    | `useAuthorizationStore`, tests             |
| `useAuthorizationStore`       | local projection cache         | Web route presentation          | Canvas controller, admin presentation      |
| `createCapabilitiesPort`      | API query adapter              | Runtime capabilities projection | `buildAppServices`, `useCapabilitiesQuery` |
| `getRuntimePlugins`           | plugin projection query        | Web plugin composition          | shell navigation, Canvas plugin registries |
| `getRouteViews`               | static route composition query | Web plugin composition          | React Router route tree                    |
| `PluginsView` readiness model | presentation read model        | Plugin observability            | plugin workbench route                     |

## Invariants

- Default permissions deny plan, run, edge-edit, plugin, and RBAC actions.
- Tests may grant permissions explicitly; product runtime must not rely on a
  permissive default.
- `/capabilities` network failures are visible query failures.
- A backend-backed plugin is executable only when the backend publishes an
  explicit `{ available: true }` row for its backend plugin id.
- A static plugin declaration is not backend execution authority.
- Static route composition may keep a backend-backed route mounted so direct
  links can be guarded and redirected, but shell navigation and runtime
  registries must still hide the plugin until backend capability is available.
- Plugin surfaces without a backend plugin id remain frontend composition only
  and still rely on API command authorization when they execute backend work.
- Every touched module has an owned-concern docblock.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> ColdStart
  ColdStart --> PermissionsDenied
  PermissionsDenied --> SessionResolved
  SessionResolved --> WorkspaceContextResolved
  WorkspaceContextResolved --> ServerProjectedPermissions

  ColdStart --> CapabilitiesPending
  CapabilitiesPending --> CapabilitiesReady
  CapabilitiesPending --> CapabilitiesError
  CapabilitiesReady --> BackendPluginAvailable
  CapabilitiesReady --> BackendPluginBlocked
  CapabilitiesError --> BackendPluginBlocked
```

## Component Map

```mermaid
flowchart LR
  Session["GET /session"]
  Workspace["GET /workspace/context"]
  Capabilities["GET /capabilities"]
  AuthStore["authorizationStore"]
  CapabilityPort["createCapabilitiesPort"]
  Registry["PLUGIN_REGISTRY projection"]
  Canvas["Canvas commands"]
  Plugins["PluginsView"]

  Session --> AuthStore
  Workspace --> AuthStore
  Capabilities --> CapabilityPort
  CapabilityPort --> Registry
  Registry --> Routes["Static route tree"]
  Registry --> Plugins
  AuthStore --> Canvas
  Canvas --> API["Protected API commands"]
```

## Consumers

| Consumer                      | Dependency                                             | Rule                                                                                  |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Canvas toolbar and controller | `useAuthorizationStore` through `useCanvasStoreFacade` | Button enablement is presentation only; API commands remain final authority.          |
| Plugin registry helpers       | runtime capabilities DTO                               | Backend-backed plugin rows must be explicit and available.                            |
| React Router route tree       | static plugin route declarations                       | Direct links are routable, then guarded by runtime plugin availability.               |
| `PluginsView`                 | capabilities query plus static registry                | Can display declarations, but readiness is degraded or blocked without backend proof. |
| App bootstrap                 | capabilities query state                               | Capability failure degrades bootstrap instead of creating a local authority payload.  |

## Negative Tests

- `authorizationStore` defaults cannot grant any executable permission.
- `createCapabilitiesPort` cannot return `frontend-local` capabilities on
  network failure.
- `getRuntimePlugins(undefined)` cannot include backend-backed plugins.
- `getRuntimePlugins({ plugins: {} })` cannot include backend-backed plugins.
- `getRouteViews()` must keep static route ownership separate from runtime
  plugin availability.
- Architecture guard checks docs, docblocks, and forbidden fail-open vocabulary.

<a id="section-web-api-authority-hardcut-user-stories"></a>

## Web API Authority Hardcut User Stories

### Scenario Coverage Matrix

```mermaid
flowchart LR
  Boot["Cold boot"] --> Deny["Default permissions deny"]
  Tests["Test harness"] --> Explicit["Explicit grants"]
  Capabilities["/capabilities"] --> Registry["Plugin projection"]
  Registry --> Available["Available row"]
  Registry --> Blocked["Missing or unavailable row"]
```

| Story           | Scenario                                                       | Acceptance                                                                                           |
| --------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| US-WEB-AUTH-001 | Cold web boot before session/workspace projections settle      | Plan, run, edge edit, plugin management, and RBAC actions are disabled by default.                   |
| US-WEB-AUTH-002 | Test harness needs an allowed user                             | The test injects permissions explicitly and does not rely on product defaults.                       |
| US-WEB-AUTH-003 | `/capabilities` returns a backend-backed plugin as unavailable | Plugin route and runtime projections exclude executable/backend-backed surfaces for that plugin.     |
| US-WEB-AUTH-004 | `/capabilities` omits a backend-backed plugin                  | The plugin is shown as unknown/degraded in inspection and excluded from runtime projection.          |
| US-WEB-AUTH-005 | `/capabilities` cannot be reached                              | The query errors visibly and backend-backed plugins are not enabled through frontend-local fallback. |
| US-WEB-AUTH-006 | A static frontend plugin has no backend plugin id              | The shell can show presentation surfaces, but API commands still require backend authorization.      |
| US-WEB-AUTH-007 | A developer adds a new backend-backed plugin                   | They must add a backend capability row and tests proving missing rows fail closed.                   |

### Story Details

#### US-WEB-AUTH-001 - Cold boot denies command authority

As a protected-route user, I need the UI to deny executable actions until the
server grants permissions so that a browser default cannot start runs or change
workspace state.

Acceptance:

- `DEFAULT_USER_PERMISSIONS` has every field set to `false`.
- Canvas can still render, but command buttons use denied permissions until
  the projection is hydrated.

#### US-WEB-AUTH-002 - Tests grant permission explicitly

As a web test author, I need explicit test permissions so that fixtures do not
look like product authority.

Acceptance:

- Tests call `setUserPermissions` or inject store doubles with explicit values.
- The product default remains fail-closed.

#### US-WEB-AUTH-003 - Backend blocks plugin readiness

As an operator, I need unavailable backend plugin capabilities to remove
executable plugin surfaces so that the browser cannot run a backend feature
that the server denies.

Acceptance:

- `getRuntimePlugins({ plugins: { cost: { available: false } } })` excludes
  `cost`.
- `PluginsView` renders the backend reason as blocked.

#### US-WEB-AUTH-004 - Missing backend row fails closed

As an operator, I need missing backend plugin rows to be treated as unknown and
not ready so that absence is not interpreted as permission.

Acceptance:

- `getRuntimePlugins({ plugins: {} })` excludes backend-backed plugins.
- `PluginsView` renders `Unknown` and degraded readiness for the missing row.

#### US-WEB-AUTH-005 - Capability query failure is visible

As a user, I need backend capability query failure to be visible as degraded
state so that the UI does not silently fabricate availability.

Acceptance:

- `createCapabilitiesPort` rejects network failures.
- App bootstrap and plugin inspection consume the query error path.

#### US-WEB-AUTH-006 - Static frontend surfaces remain presentation

As a user, I need core frontend routes to remain visible when they are local
composition surfaces so that shell navigation does not disappear just because a
backend plugin id is not needed.

Acceptance:

- Plugins without `backendPluginId` may still appear in shell projections.
- API commands under those routes remain protected by API authorization.

#### US-WEB-AUTH-007 - New backend plugin additions prove authority

As a maintainer, I need new backend-backed plugins to include capability tests
so that future extensions do not reintroduce fail-open behavior.

Acceptance:

- The semantic architecture guard names the authority invariant.
- Registry tests cover unavailable and missing backend rows.

> Acceptance scope status: Implemented. Owner: Web / API / Architecture.
