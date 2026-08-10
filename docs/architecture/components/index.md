---
title: Architecture Component Surfaces
status: Active
owner: Architecture / Docs
last_reviewed: 2026-08-10
---

# Architecture Component Surfaces

This subtree contains authored rationale and invariants for real repository
components. The Planning DB architecture read models are the structured
component and relation authority.

A component page under `docs/architecture/components/` must map to a real app,
worker, or package in the repository and it must be the single active home for
that component's authored public-surface explanation.

## Read This With

1. [DB-first Component Map](../component-map.md)
2. [System Architecture](../system/index.md)
3. [Subsystem Architecture](../system/subsystems/index.md)
4. [Reference Architecture](../reference-architecture.md)
5. [System Delivery Status](../system-delivery-status.md)
6. [DVT Domain Map](../domain-map.md)

## Current Inventory

Open the [DB-first Component Map](../component-map.md) for the complete,
deterministically ordered component catalog and exact directed relations. It is
generated only during explicit documentation publication; missing or ambiguous
repository and documentation bindings remain visible gaps.

## Component Rules

- one component, at most one active authored home;
- component pages describe current responsibilities, interfaces, code anchors,
  and queued deltas;
- subsystem and domain pages may link to a component, but they must not become
  a second component home;
- the component inventory and its relation topology must not be copied into an
  authored list;
- compatibility aliases belong in archive once active links are migrated.

## Coverage Boundary

- System and subsystem composition live outside this tree under
  [System Architecture](../system/index.md) and
  [Subsystem Architecture](../system/subsystems/index.md).
- Domain ownership and boundary rules live outside this tree under the
  `domain-*.md` pages.
- The old `web-app` alias has been removed from the active tree; `web/` is the
  canonical frontend component home.
- Flow narratives now live under `docs/architecture/system/subsystems/`; this
  tree is reserved for canonical component homes and their supporting detail.

## Related Pages

- [DB-first Component Map](../component-map.md)
- [DVT Domain Map](../domain-map.md)
- [System Architecture](../system/index.md)
- [Subsystem Architecture](../system/subsystems/index.md)
