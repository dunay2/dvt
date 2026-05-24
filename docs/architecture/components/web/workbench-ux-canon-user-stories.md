---
title: Workbench UX Canon User Stories
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-24
planning_type: user-stories
---

# Workbench UX Canon User Stories

## Frontend Maintainer

As a frontend maintainer, I need the v0.4 workbench UX draft to point to the
active workbench contract, so I do not copy draft-only menu, shell, or label
ideas into code without a task-owned behavior change.

Acceptance:

- the draft names `F-MAND-WORKBENCH-UX` as its canonical disposition;
- the active contract remains `workbench-ui-contract-and-component-inventory.md`;
- future shell behavior changes must name a command/query rail.

## Canvas Maintainer

As a Canvas maintainer, I need Canvas-specific UX affordances to stay in the
graph component family, so the global shell does not become a graph editing
panel.

Acceptance:

- Canvas keeps no-permanent-left-rail posture;
- tab labels are resolved by Canvas tab read models;
- graph authoring behavior remains outside this canon-only slice.

## Route Workbench Owner

As a route workbench owner, I need a clear path from draft UX language to route
component ownership, so each route can implement only the accepted subset that
fits its bounded context.

Acceptance:

- route-local projections stay route-local;
- route toolbars and panels remain route-owned;
- command palette or top-menu expansions require their own task.

## Planning Steward

As a planning steward, I need UX drafts to be classified as active contract,
historical input, superseded material, or future task material, so mandatory
proposals do not silently become hidden execution queues.

Acceptance:

- the canon plan includes feature mechanization for `F-MAND-WORKBENCH-UX`;
- semantic CI checks the disposition;
- no runtime code is changed by this canonization task.
