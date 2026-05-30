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

## Canvas Command-Menu User

As a Canvas user, I need file/project actions and insert actions to appear in
the upper command menus instead of as loose buttons beside Plan and Execute, so
the working surface stays focused on authoring and running the graph.

Acceptance:

- Canvas registers its active File and Insert commands only while Canvas is the
  active workbench;
- the shell renders those commands in upper menus without importing Canvas
  controller hooks;
- project snapshot import/export are available through File;
- node creation is available through Insert;
- the Canvas route toolbar keeps workflow status, Plan, Execute, and draft
  status visible, and does not duplicate the File or Insert menu commands.

## Canvas Flow Reviewer

As a reviewer, I need the menu cleanup to preserve the end-to-end graph path, so
a user can still create or inspect a graph, plan it, execute it, inspect the run,
return to Canvas, and plan/run again.

Acceptance:

- presentation tests prove File and Insert are available from the upper shell
  menu when Canvas contributes them;
- presentation tests prove the route toolbar no longer exposes loose Project or
  Insert controls;
- the existing Canvas persisted plan/run E2E flow remains the user-flow proof;
- no permanent left navigation rail is introduced.

## Planning Steward

As a planning steward, I need UX drafts to be classified as active contract,
historical input, superseded material, or future task material, so mandatory
proposals do not silently become hidden execution queues.

Acceptance:

- the canon plan includes feature mechanization for `F-MAND-WORKBENCH-UX`;
- semantic CI checks the disposition;
- no runtime code is changed by this canonization task.
