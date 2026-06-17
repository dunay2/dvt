---
title: Canvas Fowler Canon User Stories
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-23
component_type: user-stories
---

# Canvas Fowler Canon User Stories

> Owned concern: these stories define how Canvas Fowler review inputs are
> consumed without creating duplicate queues, duplicate rails, or hidden UI
> authority.

## Stories

### Canvas maintainer

As a Canvas maintainer, I want a Canvas Fowler finding to resolve to one
component owner so that graph strategy, runtime policy, contextual surfaces,
layout projection, and browser proof do not compete for the same decision.

Acceptance:

- Accepted TF-E2-L graph-strategy findings remain owned by the graph-strategy
  and admission components.
- Accepted TF-E2-POL runtime-policy findings remain owned by the runtime-policy
  boundary.
- Contextual Canvas surface findings route to their active component owner.
- Layout findings route to `CanvasLayoutPersistence`.

### Frontend maintainer

As a frontend maintainer, I want global shell navigation and Canvas contextual
surfaces to stay separate so that mature-workbench behavior does not drift into
a single navigation model.

Acceptance:

- `ListShellNavigationItems` remains a shell query.
- `RenderCanvasContextualGraphSurface` remains a Canvas-local query.
- Browser proof stays attached to the component evidence row without redefining
  product semantics.

### Planning steward

As a planning steward, I want mandatory Canvas proposals to have explicit
Planning DB ownership so that proposed work is either closed, reference-only,
accepted, superseded, or promoted to a task.

Acceptance:

- `F-MAND-CANVAS-FOWLER` is the owning task for this canonization.
- Future Canvas Fowler findings that still need implementation become Planning
  DB tasks before code changes begin.
- Review prose does not act as the work queue.

### Browser proof reviewer

As a browser proof reviewer, I want Cypress and visual proof to map to a named
query rail so that geometry assertions remain explainable and reviewable.

Acceptance:

- Graph composition proof maps to the current Canvas component evidence row.
- Label readability proof maps to the component or presenter that owns the
  rendered surface.
- Route locality proof checks Canvas outlet ownership rather than shell-nav
  placement.

### Product reviewer

As a product reviewer, I want Canvas authoring improvements to reference the
same canon owner so that UI polish, route behavior, and governance evidence can
be compared without reading every historical review.

Acceptance:

- The review status board names the canonical disposition.
- The graph architecture index links this canon component.
- The buzon analysis records patterns, antipatterns, drift, and future lessons.
