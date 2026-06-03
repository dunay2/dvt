---
title: Frontend Buzon Fowler Canonization Review
status: Accepted
owner: Frontend / Product / Architecture
last_reviewed: 2026-05-25
planning_type: review
lane: E
task_id: E-BUZON-FOWLER-CANON-1
---

# Frontend Buzon Fowler Canonization Review

## Purpose

This review canonizes the Lane E portion of the tracked `buzon/` Fowler
analysis set. The mailbox is not an execution queue. Each frontend or
workbench analysis below is either linked to formal documentation, closed by
accepted evidence, routed to an existing Planning DB task, or explicitly moved
out of Lane E ownership.

## Governing Sources

- [Governance document and rule inventory](../../status/governance-document-rule-inventory.md)
- [Planning control tower](../../state/planning-control-tower.md)
- [Backlog intake reconciliation review](./20260525-backlog-intake-reconciliation-review.md)
- [Buzon Fowler canonization inventory](./20260525-buzon-fowler-canonization-inventory.md)
- [Command and query rail governance](../../../architecture/command-query-rail-governance.md)
- [Fowler opportunity planning governance](../../../architecture/fowler-opportunity-planning-governance.md)

## Operator And Architect Reading

Demanding user reading:

- The product must not show duplicate bars, duplicate read-only signals, or
  dead primary actions.
- Canvas, Code, Artifacts, Runs, Diff, and Templates must let an operator do
  the task the screen promises, with unavailable states stated honestly.
- A mailbox analysis is not useful to product prioritization unless it is
  either visible in canonical docs or tied to a Planning DB task.

Architecture and development reading:

- Lane E should reuse existing command/query rails such as
  `CreateCanvasDocumentCommand`, `SaveWorkspaceGraphDraft`,
  `GetWorkspaceGraphDraft`, `ListWorkspaceFiles`, `GetWorkspaceFileContent`,
  and `GET /runs/:runId/events`.
- Findings that have already been mechanized, componentized, or closed should
  be marked as evidence-backed instead of becoming duplicate work.
- Remaining product debt should point at existing open tasks before creating
  another task row.

## Current Product-Debt Result

No new Lane E task is created by this sweep. The remaining executable product
debt already has Planning DB ownership:

| Remaining debt                                                               | Existing owner                                           | Disposition                                                                 |
| ---------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| Plan to run core flow from Canvas selection through real API start           | `F-08`                                                   | Existing blocked Lane E implementation task.                                |
| Backend-backed Artifacts, Diff, Lineage, Cost, Plugins, and Admin activation | `F-11`                                                   | Existing blocked Lane E implementation task.                                |
| Remaining frontend mandatory proposal action rows outside F-29/F-30          | `E-PROP-DISP-1`                                          | Existing queued Lane E disposition task.                                    |
| Code, Artifacts, Monaco, Templates, and execution-template proposal actions  | `F-30` plus `F-30-B`, `F-30-C`, `F-30-GRAPH-CODE-PARITY` | Closed or explicitly decomposed before this review.                         |
| Canvas workbench proposal actions and Insert/Add palette                     | `F-29`, `F-29-B`, `F-29-C`                               | Closed by proposal disposition, browser proof, and Insert palette closeout. |

## Zero-Reference Priority Disposition

These sources were called out by the mailbox inventory because they had no
direct `docs/**` reference before this review.

| Source                                                                                | User-facing concern                                                                    | Canonical owner                                                                                                                                                                       | Disposition                                                                                                                                          |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buzon/20260430-codex-fowler-canvas-ready-node-authoring-analysis.md`                 | Ready canvases had no task-focused way to add governed nodes.                          | `F-29-C`, [F-29-C Canvas Insert Palette Closeout](../../closeouts/20260525-f29c-canvas-insert-palette-closeout.md)                                                                    | Closed by evidence. Ready and empty canvases now use the on-demand Insert/Add palette through the existing graph command boundary.                   |
| `buzon/20260430-codex-frontend-operability-fowler-review.md`                          | Browser refresh, local layout, auth retry, and missing backend rails.                  | `F-28`, `F-29-B`, `F-30`, `F-11`                                                                                                                                                      | Split. Canvas layout/auth proof is closed by accepted Canvas work; backend rail gaps remain in existing blocked task `F-11`.                         |
| `buzon/20260510-codex-fowler-web-api-mock-hardcut-semantic-encapsulation-analysis.md` | Product web runtime must not depend on fixture-backed authority.                       | `F-04`, `F-11`, `F-30`, `E-PROP-DISP-1`                                                                                                                                               | Task-linked. Product composition hard cut is already governed; remaining missing backend rails stay in existing task owners.                         |
| `buzon/20260516-codex-fowler-canvas-screen-problems-architecture-analysis.md`         | Canvas screen had competing bars, duplicated statuses, and low-priority first actions. | `F-15-D`, `F-15-F`, `F-28`, `F-29-C`                                                                                                                                                  | Closed and split by evidence. Shell chrome, no permanent rail, route-local commands, and Insert/Add palette now have accepted closeouts.             |
| `buzon/20260516-codex-fowler-element-canvas-empty-state-placement.md`                 | First-canvas entry looked secondary in the viewport.                                   | `F-15-E`, `F-15-F`, [Canvas workbench screen composition component](../../../architecture/components/web/appshell/canvas-workbench-screen-composition-component.md)                   | Closed by evidence. First-canvas selection is now a template choice inside the active workspace, not a generic centered state card.                  |
| `buzon/20260516-codex-fowler-element-canvas-route-shell-posture.md`                   | Loading, needs-canvas, read-only, and ready states competed in shell chrome.           | `TF-E2-F`, `F-15-F`, [Canvas route presentation component](../../../architecture/components/web/graph/canvas-route-presentation-component.md)                                         | Closed by evidence. Route-visible Canvas state is modeled before rendering and guarded by route-state tests.                                         |
| `buzon/20260516-codex-fowler-element-canvas-topbar-command-priority.md`               | Disabled Canvas commands occupied top-bar priority.                                    | `F-15-F`, [Canvas workbench screen composition component](../../../architecture/components/web/appshell/canvas-workbench-screen-composition-component.md)                             | Closed by evidence. Canvas commands stay route-local; the persistent top bar no longer hosts Canvas command buttons.                                 |
| `buzon/20260516-codex-fowler-element-readonly-first-canvas-policy.md`                 | Read-only first-canvas posture could imply mutating creation.                          | `F-15-G`, `F-15-H`, `TF-E2-K-H`, [Canvas first-canvas creation capability component](../../../architecture/components/web/graph/canvas-first-canvas-creation-capability-component.md) | Closed by evidence. First-canvas creation availability is separated from graph mutation permission and guarded by architecture tests.                |
| `buzon/20260518-codex-fowler-f27-alpha-route-gate-branch-analysis.md`                 | Route-level alpha readiness could be inferred from child slices.                       | `F-27`, [F-27 Alpha Route Acceptance Matrix Closeout](../../closeouts/20260514-f27-alpha-route-acceptance-matrix-closeout.md)                                                         | Closed by evidence. F-27 remains the only route-level alpha authority.                                                                               |
| `buzon/20260518-f10-fowler-run-event-convergence-analysis.md`                         | Runs and Console needed one event stream semantic model.                               | `F-10`, run event timeline model and tests                                                                                                                                            | Closed by evidence. Current web tests include `runEventTimelineModel.test.ts`, shared run-event presentation, and Console/Runs convergence coverage. |

## Referenced Lane E Source Disposition

These mailbox analyses already had at least one formal reference. This review
records their Lane E disposition so they do not remain implicit backlog.

| Source                                                                                     | Canonical owner                                   | Disposition                                                                                                                 |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `buzon/20260428-codex-fowler-web-graph-startup-and-draft-recovery-analysis.md`             | `TF-E2-M`, Canvas startup and draft recovery docs | Closed by evidence.                                                                                                         |
| `buzon/20260429-codex-canvas-operability-auth-and-drag-fowler-review.md`                   | `F-29-B`, Canvas browser-operability proof        | Closed by evidence.                                                                                                         |
| `buzon/20260502-tf-e2-m-b-canvas-draft-access-posture-fowler-review.md`                    | `TF-E2-M-B`                                       | Closed by evidence.                                                                                                         |
| `buzon/20260502-tf-e2-m-d-startup-route-readiness-fowler-review.md`                        | `TF-E2-M-D`                                       | Closed by evidence.                                                                                                         |
| `buzon/20260503-codex-fowler-web-store-domain-ownership-analysis-and-remediation.md`       | `F-05`                                            | Closed by evidence.                                                                                                         |
| `buzon/20260503-tf-e2-a-authoring-draft-hard-cut-fowler-review.md`                         | `TF-E2-A`                                         | Closed by evidence.                                                                                                         |
| `buzon/20260503-tf-e2-a-fowler-hard-qa-review-followup.md`                                 | `TF-E2-A`, `TF-E2-E`                              | Closed by evidence.                                                                                                         |
| `buzon/20260504-codex-fowler-canvas-workbench-tabs-and-layout-analysis-and-remediation.md` | `F-28`, `F-15-F`, `F-MAND-CANVAS-FOWLER`          | Closed by evidence.                                                                                                         |
| `buzon/20260504-codex-fowler-code-tab-workspace-files-analysis-and-plan.md`                | `F-30-B`, Code workspace files docs               | Closed by evidence.                                                                                                         |
| `buzon/20260506-codex-fowler-canvas-workbench-shell-context-hardening-review.md`           | `F-28-A`, `F-15-F`                                | Closed by evidence.                                                                                                         |
| `buzon/20260506-codex-fowler-canvas-workbench-shell-context-review-and-risk.md`            | `F-28-A`, `F-15-F`                                | Closed by evidence.                                                                                                         |
| `buzon/20260506-codex-fowler-canvas-workbench-stage-1-text-only-tabs-review.md`            | `F-28-A`, `F-15-F`                                | Closed by evidence.                                                                                                         |
| `buzon/20260510-codex-fowler-web-api-authority-hardcut-analysis.md`                        | Web API authority hard-cut plan, `F-04` family    | Closed by evidence.                                                                                                         |
| `buzon/20260510-codex-fowler-web-api-remediation-analysis.md`                              | Web API effective workspace context remediation   | Closed by evidence.                                                                                                         |
| `buzon/20260510-codex-fowler-workspace-port-decomposition-analysis.md`                     | Workspace port decomposition plan                 | Closed by evidence.                                                                                                         |
| `buzon/20260510-web-api-remediation-execution-log.md`                                      | Web API remediation plan                          | Reference-only execution log.                                                                                               |
| `buzon/20260511-codex-fowler-canvas-project-snapshot-analysis-and-remediation.md`          | `F-28-C`                                          | Closed by evidence.                                                                                                         |
| `buzon/20260514-codex-fowler-f06-query-boundary-analysis.md`                               | `F-06`                                            | Closed by evidence.                                                                                                         |
| `buzon/20260514-codex-fowler-f27-alpha-route-gate-analysis.md`                             | `F-27`                                            | Closed by evidence.                                                                                                         |
| `buzon/20260515-codex-fowler-f05-store-domain-ownership-hard-review.md`                    | `F-05`                                            | Closed by evidence.                                                                                                         |
| `buzon/20260515-codex-fowler-f27-session-gate-runtime-unavailable-analysis.md`             | `F-27`, `TF-E2-M`                                 | Closed by evidence.                                                                                                         |
| `buzon/20260516-codex-fowler-element-workbench-navigation-rail-disposition.md`             | `F-15-D`, `F-15-F`                                | Closed by evidence.                                                                                                         |
| `buzon/20260516-codex-fowler-f15-canvas-view-menu-architecture-analysis.md`                | `F-15`, Canvas View menu docs                     | Closed by evidence.                                                                                                         |
| `buzon/20260518-codex-fowler-f15d-workbench-navigation-rail-disposition.md`                | `F-15-D`                                          | Closed by evidence.                                                                                                         |
| `buzon/20260518-codex-fowler-f15e-canvas-startup-template-selection.md`                    | `F-15-E`                                          | Closed by evidence.                                                                                                         |
| `buzon/20260518-codex-fowler-f27-plan-run-readiness-analysis.md`                           | `F-27`, `F-08`                                    | Split. Route-gate evidence is closed; product execution flow remains in existing blocked task `F-08`.                       |
| `buzon/20260518-f12-fowler-canvas-legacy-retirement-analysis.md`                           | `F-12`                                            | Closed by evidence.                                                                                                         |
| `buzon/20260518-f14-fowler-frontend-test-governance-analysis.md`                           | `F-14`                                            | Closed by evidence.                                                                                                         |
| `buzon/20260518-f14a-fowler-web-vitest-changed-suite-routing-analysis.md`                  | `F-14-A`                                          | Closed by evidence.                                                                                                         |
| `buzon/20260518-f16-fowler-dense-operational-tables-analysis.md`                           | `F-16`                                            | Closed by evidence.                                                                                                         |
| `buzon/20260518-f24-fowler-runs-dense-table-token-convergence-analysis.md`                 | `F-24`, `F-16`                                    | Closed by evidence.                                                                                                         |
| `buzon/20260519-codex-fowler-f15f-canvas-workbench-screen-consolidation.md`                | `F-15-F`                                          | Closed by evidence.                                                                                                         |
| `buzon/20260519-codex-fowler-f15g-first-canvas-creation-capability.md`                     | `F-15-G` mechanized plan                          | Closed by evidence.                                                                                                         |
| `buzon/20260519-f17b-fowler-monaco-diff-review-surface-analysis.md`                        | `F-17-B`                                          | Closed by evidence.                                                                                                         |
| `buzon/20260520-codex-fowler-f15h-first-canvas-draft-capability-split.md`                  | `F-15-H` mechanized plan                          | Closed by evidence.                                                                                                         |
| `buzon/20260520-f14b-fowler-web-vitest-pr-changed-suite-routing-analysis.md`               | `F-14-B`                                          | Closed by evidence.                                                                                                         |
| `buzon/20260520-f17c-fowler-artifacts-monaco-readonly-viewer-analysis.md`                  | `F-17-C`                                          | Closed by evidence.                                                                                                         |
| `buzon/20260520-f17g-fowler-code-monaco-editable-workspace-access-analysis.md`             | `F-17-G`                                          | Closed by evidence.                                                                                                         |
| `buzon/20260521-codex-fowler-route-workbench-frame-analysis-and-remediation.md`            | Route workbench frame docs, `F-15` family         | Closed by evidence.                                                                                                         |
| `buzon/20260522-codex-fowler-f21-execution-template-workbench-analysis.md`                 | `F-21`                                            | Closed by evidence.                                                                                                         |
| `buzon/20260522-f17d-fowler-templates-monaco-preview-analysis.md`                          | `F-17-D`                                          | Closed by evidence.                                                                                                         |
| `buzon/20260522-f17e-fowler-monaco-bundle-isolation-analysis.md`                           | `F-17-E`                                          | Closed by evidence.                                                                                                         |
| `buzon/20260522-f17f-fowler-workspace-diff-backend-rail-analysis.md`                       | `F-17-F`, `F-11`                                  | Split. Monaco/backend rail posture is closed where implemented; backend activation remains in existing blocked task `F-11`. |
| `buzon/20260523-codex-fowler-web-auth-project-onboarding-canon.md`                         | `E-MAND-WEB-AUTH-ONBOARDING-CANON`                | Closed by evidence.                                                                                                         |
| `buzon/20260524-codex-fowler-workbench-ux-canon.md`                                        | `F-MAND-WORKBENCH-UX`                             | Closed by evidence.                                                                                                         |

## Out-Of-Lane Corrections

The mailbox inventory priority set included one source that is not Lane E
frontend work after inspection:

| Source                                                                                      | Owning lane                                                | Disposition                                                                                |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `buzon/20260429-codex-fowler-temporal-step-plugin-architecture-analysis-and-remediation.md` | Runtime / Temporal canonization (`C-BUZON-FOWLER-CANON-1`) | Routed out of Lane E. Do not create a frontend task for Temporal step-plugin architecture. |

## Closeout Decision

`E-BUZON-FOWLER-CANON-1` can be closed when this review is synced into the
docs indexes and recorded as Planning DB evidence. The next Lane E queue should
not be another mailbox archaeology task unless a new `buzon/` source is added
or the Planning DB reports new unlinked frontend mailbox rows.
