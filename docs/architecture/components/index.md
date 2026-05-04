---
title: Architecture Component Surfaces
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-09
---

# Architecture Component Surfaces

This subtree is the canonical catalog for real repo components.

A component page under `docs/architecture/components/` must map to a real app,
worker, or package in the repository and it must be the single active home for
that component's public surface.

## Read This With

1. [System Architecture](../system/index.md)
2. [Subsystem Architecture](../system/subsystems/index.md)
3. [Reference Architecture](../reference-architecture.md)
4. [System Delivery Status](../system-delivery-status.md)
5. [DVT Domain Map](../domain-map.md)

## Current Component Entry Points

- [@dvt/engine](./engine/index.md): canonical engine component home for public
  operations, interfaces, and supporting engine subtopics.
- [@dvt/planner](./planner/index.md): planner package boundary and canonical
  planner ingress truth.
- [apps/api](./api/index.md): authenticated HTTP composition root and runtime
  entry surface.
- [@dvt/delivery](./delivery/index.md): delivery runtime library and downstream
  processing surface.
- [dvt-outbox-worker](./outbox-worker/index.md): outbox delivery host,
  retention, and purge runtime composition root.
- [dvt-projector-worker](./projector-worker/index.md): snapshot rebuild and
  projector host composition root.
- [dvt-lineage-worker](./lineage-worker/index.md): lineage mapper/sink host and
  operational surface.
- [web](./web/index.md): canonical frontend workspace component home for the
  `apps/web` deployable shell and `@dvt/web` package surface.
- [ci-governance](./ci-governance/index.md): repository automation component
  for local changed-file gates, feature mechanization, generated governance
  checks, and CI readiness scripts.

## Component Rules

- one component, one active home;
- component pages describe current responsibilities, interfaces, code anchors,
  and queued deltas;
- subsystem and domain pages may link to a component, but they must not become
  a second component home;
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

- [DVT Component Map](../component-map.md)
- [DVT Domain Map](../domain-map.md)
- [System Architecture](../system/index.md)
- [Subsystem Architecture](../system/subsystems/index.md)
