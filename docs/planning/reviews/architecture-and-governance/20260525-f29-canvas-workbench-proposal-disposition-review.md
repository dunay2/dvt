---
title: F-29 Canvas Workbench Proposal Disposition Review
status: Review
date: 2026-05-25
owners:
  - apps/web
planning_type: review
---

# F-29 Canvas Workbench Proposal Disposition Review

## Scope

F-29 reconciles Canvas and Canvas-workbench mandatory proposal actions into
Planning DB lineage. It is a classification task, not a new implementation
slice.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/status/review-proposal-disposition-index-20260510.md`
- `docs/planning/status/docs-task-disposition-inventory-20260510.md`

## User QA Finding

The demanding-user reading is:

- Canvas must let a user create and manipulate a workflow without duplicate
  permanent rails.
- Canvas must make preview/run readiness understandable without hidden state.
- Canvas must not claim a full workbench insertion model unless users can
  discover and operate it.

The current browser proof passes for graph authoring, drag, persisted preview,
and run-readiness gating:

- `canvas-happy-path-draggable.cy.ts`
- `canvas-preview-run-persisted.cy.ts`

That closes the regression that created `F-29-B`.

## Disposition Matrix

| Source                                                                           | Disposition                                                                             | Evidence / task lineage                                                                                                             | Successor                                                           |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `canvas-fowler-canon-plan-20260523.md`                                           | Task-linked and evidence-closed for canonization                                        | `F-MAND-CANVAS-FOWLER`, `tools/ci/canvas-fowler-canon.test.mjs`, `F-29`                                                             | None                                                                |
| `canvas-workbench-fowler-remediation-plan-20260504.md`                           | Superseded for execution routing by the Canvas Fowler canon                             | `F-MAND-CANVAS-FOWLER`, `F-15`, `F-28`, `F-29-B`                                                                                    | None                                                                |
| `canvas-workbench-tabs-placement-design-plan-20260503.md`                        | Closed by workbench-tab implementation and subsequent route consolidation               | `F-15`, `F-15-F`, `F-28`, Canvas workbench tab tests and route-state guards                                                         | None for tab placement                                              |
| `canvas-workbench-shell-save-export-sequence-plan-20260505.md`                   | Partially closed by shell/save/export sequence; Add/Insert palette remains product work | `F-28`, `F-28-A`, `F-28-B`, `F-28-C`, `F-29-B`                                                                                      | `F-29-C`                                                            |
| `canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md` | Chrome simplification closed; Add/Insert palette remains product work                   | `F-28-A`, `F-28`, `F-29-B`                                                                                                          | `F-29-C`                                                            |
| `canvas-workbench-stage-2-autosave-e2e-proof-plan-20260508.md`                   | Evidence-closed                                                                         | `F-28-B`, `20260514-f28-canvas-workbench-sequence-closeout.md`                                                                      | None                                                                |
| `canvas-workbench-stage-3-project-snapshot-roundtrip-plan-20260511.md`           | Evidence-closed                                                                         | `F-28-C`, `20260511-f28c-project-snapshot-roundtrip-closeout.md`                                                                    | None                                                                |
| `canvas-view-menu-contribution-plan-20260516.md`                                 | Evidence-closed                                                                         | `F-15`, `20260516-f15-canvas-view-menu-closeout.md`                                                                                 | None                                                                |
| `canvas-visible-i18n-debt-plan-20260508.md`                                      | Debt-registration closed; implementation remains outside F-29                           | Feature mechanization `CANVAS-VISIBLE-I18N-DEBT-20260508`; visual-token/i18n follow-up is not the Canvas workbench proposal blocker | Route to `E-PROP-DISP-1` if implementation prioritization is needed |
| `dvt-workbench-ux-specification-v0-4-20260505-draft.md`                          | Canonized and split                                                                     | `F-MAND-WORKBENCH-UX`, `F-15`, `F-24`, `F-29`, `F-30`                                                                               | `F-29-C` for Add/Insert palette only                                |

## New Product Task

`F-29-C` is the real remaining product task from the Canvas workbench proposal
family:

- implement Canvas Insert/Add as an on-demand, keyboard-accessible node palette;
- keep it command-driven and unpinned by default;
- show only node types valid for the active workbench;
- support search, arrow navigation, and Enter insertion;
- prove with browser and architecture tests that it does not create a second
  permanent navigation rail.

Prepared-asset add-to-Canvas commands are not part of F-29. The tab-placement
plan explicitly excluded that work, and Artifacts/Code parity is already routed
through F-30 and `F-30-GRAPH-CODE-PARITY`.

## Outcome

F-29 can close once `F-29-C` exists in Planning DB and this review plus browser
proof are recorded as evidence. The remaining frontend mandatory proposal
action rows outside this Canvas scope belong to `E-PROP-DISP-1`, not to F-29.
