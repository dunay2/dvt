---
title: Admin Route Position Component
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-30
planning_type: architecture
---

# Admin Route Position Component

## Purpose

This guide defines the local component semantics for preserving the operator's
position inside the Admin and RBAC route.

The component owns route-local tab position only. It does not own Admin data,
RBAC policy, platform health, role persistence, audit-log persistence, or
backend authorization.

## Public API

| API                              | Owner                             | Responsibility                                                                     |
| -------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------- |
| `AdminView`                      | `AdminView.tsx`                   | Compose the Admin route and bind active tab to URL search state.                   |
| `initialTab`                     | `AdminView.tsx`                   | Test/bootstrap fallback when the URL has no valid tab.                             |
| `resolveActiveAdminTab(...)`     | `admin/adminRoutePosition.ts`     | Resolve a valid Admin section from `URLSearchParams`.                              |
| `buildAdminSectionLocation(...)` | `admin/adminRoutePosition.ts`     | Build the selected `?tab=...` destination, retaining unrelated route state.        |
| `adminSectionNavigation`         | `admin/adminRoutePosition.ts`     | Supply the one section definition and pure URL contract to the generic shell menu. |
| `useAdminViewData()`             | `views/admin/useAdminViewData.ts` | Supply platform, capabilities, role and audit data to passive tabs.                |

## Invariants

- The URL is the durable owner of Admin tab position.
- Refreshing `/admin?tab=audit` must reopen the Audit Log tab.
- Invalid tab values must fall back to the route default instead of crashing.
- Route position must not be stored in component-only `useState`.
- Admin route position must not bypass backend authorization or capability
  checks.
- Presentation tabs are passive consumers of `useAdminViewData()` outputs.
- The Admin icon opens its section menu; real links select sections through the
  existing Router guards. Escape restores focus to the icon.
- The shared top bar owns the visible Admin heading. AdminView does not repeat
  a local header, centered TabsList or tabpanel tied to a removed tab trigger.
- Same-route selection preserves unrelated search parameters and the hash.
- Canvas, Git and the shell frame remain mounted while protected route content
  follows its existing admission boundary.

## Transitions

### Tab selection

```mermaid
sequenceDiagram
  participant Operator
  participant Menu as Shell section menu
  participant Position as Admin URL contract
  participant Admin as AdminView
  participant Router as React Router search params

  Operator->>Menu: select Audit Log
  Menu->>Position: build section destination
  Position-->>Menu: /admin?tab=audit
  Menu->>Router: follow existing Router link
  Router-->>Admin: active tab resolves from URL
```

### Browser refresh

```mermaid
stateDiagram-v2
  [*] --> ReadUrl
  ReadUrl --> ValidTab: tab is platform, roles, permissions, or audit
  ReadUrl --> DefaultTab: tab missing or invalid
  ValidTab --> RenderTab
  DefaultTab --> RenderTab
```

## Consumers

Direct consumers:

- React Router route `/admin`
- `AdminView.test.tsx`
- Admin platform, roles, permissions and audit tab components

Indirect consumers:

- Platform operators who refresh while inspecting Admin state
- PR reviewers validating route-position semantics
- Local protected-runtime debugging where Admin is used to inspect backend
  readiness and capabilities

## Semantic Encapsulation

`AdminView.tsx` renders the selected passive Admin/RBAC section from its URL. The
cohesive `adminRoutePosition` contract now has two consumers: AdminView and the
shell menu. It owns IDs, fallback and URL construction once. This is a concern-
owned extraction, not a generic shared route-state store. The route does not absorb RBAC policy, fetch mapping,
platform health parsing, or audit-log filtering beyond composition.

The reusable shell menu renders optional navigation metadata. It delegates URL
meaning to the owning route contract and does not create a generic route-tab
state authority. An optional heading uses the existing shell navigation model.

## Negative Coverage

Primary tests:

- `apps/web/src/app/views/AdminView.test.tsx`
- `apps/web/src/app/views/AdminView.architecture.test.ts`

The tests cover:

- tab selection writes `?tab=audit`;
- browser refresh hydrates from `/admin?tab=audit`;
- the route does not use component-only `useState` for tab position;
- the local component guide and Fowler analysis remain discoverable.

## Drift To Watch

- Do not move tab position into local React state.
- Do not let Admin tabs directly decode auth tokens or call protected endpoints
  outside service/component boundaries.
- Do not promise editable RBAC behavior until the backend route and capability
  contract are verified.
