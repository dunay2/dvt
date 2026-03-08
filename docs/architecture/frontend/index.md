---
title: Frontend Architecture
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-03-08
---

# Frontend Architecture

This page is the canonical landing page for frontend documentation inside
`docs/`.

The detailed product and implementation notes still live under `apps/web/`, but
they are not allowed to behave like a parallel documentation root. Start here,
then go to the linked local frontend docs.

## Current Reality

- `apps/web` is a real UI codebase, not just a mock folder.
- It is still only partially connected to backend reality.
- Mock data still dominates large parts of the surface.
- There are currently no automated tests under `apps/web`.

That means the frontend exists, but its documentation must be explicit about the
gap between visual breadth and production-backed behavior.

## What This Section Covers

- shell structure and routing;
- the intended Canvas -> Plan -> Run -> Monitor interaction path;
- the current backend boundary the UI is allowed to rely on;
- where local frontend docs live;
- which commands verify the client surface today.

## Canonical Reading Order

1. [apps/web/README.md](../../../apps/web/README.md)
2. [apps/web/FRONTEND_PLAN_BACK_ALIGNMENT.md](../../../apps/web/FRONTEND_PLAN_BACK_ALIGNMENT.md)
3. [apps/web/DOCUMENTATION_INDEX.md](../../../apps/web/DOCUMENTATION_INDEX.md)
4. [System Delivery Status](../system-delivery-status.md)
5. [G8 Real Auth Final Spec](../../planning/gaps/G8-REAL-AUTH-FINAL-SPEC.md)

## Primary Code Anchors

- App bootstrap:
  [apps/web/src/main.tsx](../../../apps/web/src/main.tsx)
- App shell:
  [apps/web/src/app/App.tsx](../../../apps/web/src/app/App.tsx)
- Route map:
  [apps/web/src/app/routes.ts](../../../apps/web/src/app/routes.ts)
- Top application bar:
  [apps/web/src/app/components/TopAppBar.tsx](../../../apps/web/src/app/components/TopAppBar.tsx)
- Current mock-heavy data sources:
  [apps/web/src/app/data/mockData.ts](../../../apps/web/src/app/data/mockData.ts)
  and
  [apps/web/src/app/data/mockDbtData.ts](../../../apps/web/src/app/data/mockDbtData.ts)

## Architectural Position

### UI scope

The frontend is the operator-facing and editor-facing surface for DVT. It is
responsible for navigation, visualization, selection, and status display. It is
not allowed to become a hidden orchestration engine.

### Backend boundary

The current stable backend boundary is still narrow:

- health and readiness;
- version and db readiness;
- protected runtime endpoints growing behind the API auth boundary.

Do not document the UI as if plan, run, lineage, cost, and artifact contracts
were already production-complete unless the API actually exposes them.

### Documentation rule

When a frontend-local doc is important, this page must link to it. The local
doc must not be the only place where the topic is discoverable.

## Verification

- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web build`

## Open Gaps

- No frontend test suite exists yet.
- Mock-data paths still shape the main UX.
- The docs are now reachable, but the product boundary is still ahead of the
  implementation in several views.

If this page becomes stale, frontend documentation becomes misleading again very
quickly because local docs in `apps/web/` are richer than the published surface.
