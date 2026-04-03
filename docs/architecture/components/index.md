---
title: Architecture Component Surfaces
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-02
---

# Architecture Component Surfaces

This folder contains the current component entry pages for deployable apps and
package-level architecture surfaces that benefit from a dedicated view.

These pages are supporting architecture docs, not the normative source for
behavioral invariants. They should describe the real current surface, its
interfaces, and its queued deltas. They should not degrade into generic
routing-only pages.

## Read This With

1. [Reference Architecture](../reference-architecture.md)
2. [System Delivery Status](../system-delivery-status.md)
3. [DVT Component Map](../component-map.md)
4. [DVT Domain Map](../domain-map.md)

## Current Component Entry Points

| Entry page                                  | Covers                                                                 | Use it for                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [apps/api](api/index.md)                    | the API composition root and runtime entry surface                     | current responsibilities, interfaces, and queued admission/API deltas                         |
| [@dvt/delivery](delivery/index.md)          | the delivery runtime library                                           | runtime ownership, worker-facing interfaces, and downstream event processing                  |
| [dvt-outbox-worker](outbox-worker/index.md) | the delivery composition root under `apps/outbox-worker`               | operational host wiring, shard ownership, retention, and purge runtime posture                |
| [apps/web](web-app/index.md)                | the deployable browser application shell                               | routing, platform health, run-monitoring UX, and backend consumption posture                  |
| [@dvt/web package surface](web/index.md)    | the same workspace viewed as the package consumed by the browser build | frontend module boundaries, package-level responsibilities, and local UI architecture anchors |

## Coverage Boundary

- Execution core, provider adapters, and state-store internals already have a
  richer canonical surface under [Engine](../engine/index.md). This subtree
  does not duplicate that material.
- The frontend appears twice on purpose:
  `apps/web` is the deployable application view, while `@dvt/web` is the
  package-level view of the same workspace.
- Older deep-dive component narratives remain available below these entry pages,
  but they are supporting detail only when the current entry page explicitly
  keeps them in scope.

## Required Shape For Component Pages

Each current component page in this subtree should include:

- current responsibilities;
- inbound and outbound interfaces;
- concrete code anchors;
- current posture and limitations;
- queued or accepted planned deltas.

## Related Pages

- [DVT Component Map](../component-map.md)
- [DVT Domain Map](../domain-map.md)
- [System Delivery Status](../system-delivery-status.md)
- [Engine](../engine/index.md)
- [Frontend Architecture](../frontend/index.md)
