---
title: F-15-F Canvas Workbench Screen Consolidation Closeout
status: Accepted
owner: Frontend / Shell / Canvas
last_reviewed: 2026-05-20
planning_type: closeout
lane: E
task_id: F-15-F
parent_task_id: F-15
---

# F-15-F Canvas Workbench Screen Consolidation Closeout

## Scope

This closeout reconciles `E/F-15-F` after the Canvas workbench screen
composition was implemented on `main`. It does not add new product behavior.
It closes the planning drift between the implemented shell posture, the
component documentation, and the task state.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/f15f-canvas-workbench-screen-consolidation-plan-20260519.md`
- `docs/architecture/components/web/appshell/canvas-workbench-screen-composition-component.md`
- `docs/architecture/components/web/appshell/canvas-workbench-screen-composition-user-stories.md`

## Outcome

`/canvas` now follows the accepted workbench screen composition:

- the permanent left rail is absent on the Canvas workbench route;
- Canvas route commands do not portal into the persistent top bar;
- the top bar keeps brand, connection health, `Workspace`, and `Vista`
  separated;
- `Workspace` exposes Canvas, Runs, Plugins, Admin, workspace context, and Git
  context when the rail is hidden;
- `Vista` remains scoped to panels, focus mode, grid, palette, and Canvas visual
  view contributions;
- the first-canvas state renders localized template copy and keeps template
  selection on the existing `CreateCanvasDocumentCommand` rail.

## Fowler Disposition

| Finding                                          | Disposition                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| Responsibility overload in top-bar chrome        | Closed by keeping Canvas commands route-local.                                   |
| Boundary drift between shell and Canvas route    | Closed by guarding against `shell-top-bar-canvas-controls` and portal ownership. |
| Hidden navigation after rail removal             | Closed by making global navigation first-class in the `Workspace` menu.          |
| Registry language leak in first-canvas templates | Closed by `CanvasTemplatePresentation`.                                          |
| Documentation drift                              | Closed by component guide, user stories, plan, and this closeout.                |

## Browser And Test Evidence

| Command                                                                                                        | Result                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts` | Passed: Cypress built the web app, served `http://127.0.0.1:4173`, opened `/canvas`, verified shell/menu posture, and selected a template through `PUT /workspace/graph/draft`. |

Browser plugin was not available in this session, so the rendered frontend
validation used the repository-governed Cypress native runner.

## No-Debt And No-Stub Evidence

- No new debt entry is created.
- No product code stub, placeholder, fake implementation, or fake success path
  is introduced.
- No lint, type, test, hook, or quality rule is disabled or relaxed.
- No backend, contract, adapter, planner, or API surface is touched.
- No new command/query rail is introduced; the slice reuses the declared shell
  query rails and `CreateCanvasDocumentCommand`.
