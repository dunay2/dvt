---
title: F-30 Monaco, Code, Artifacts, Templates Reconciliation Review
status: Review
date: 2026-05-25
owners:
  - apps/web
planning_type: review
---

# F-30 Monaco, Code, Artifacts, Templates Reconciliation Review

## Scope

F-30 reconciles mandatory proposal actions for F-17-B, F-17-C, F-17-D,
F-17-E, F-17-G, F-21, and the Artifacts workspace project-files follow-up.
The purpose is classification and task lineage, not additional product
implementation.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/status/db-surface-inventory.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`

## Classification

| Source                                       | Disposition                        | Evidence                                                                                                                            | Successor                                                |
| -------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| F-17-B Monaco Diff review surface            | Evidence-closed                    | `docs/planning/closeouts/20260519-f17b-monaco-diff-review-surface-closeout.md`                                                      | None                                                     |
| F-17-C Artifacts Monaco read-only viewer     | Evidence-closed                    | `docs/planning/closeouts/20260525-f17c-artifacts-monaco-readonly-viewer-closeout.md`                                                | None for viewer boundary                                 |
| F-17-D Templates Monaco preview              | Evidence-closed                    | `docs/planning/closeouts/20260522-f17d-templates-monaco-preview-closeout.md`                                                        | None                                                     |
| F-17-E Monaco bundle isolation               | Evidence-closed                    | `docs/planning/closeouts/20260522-f17e-monaco-bundle-isolation-closeout.md`                                                         | None                                                     |
| F-17-G Code Monaco editable workspace access | Evidence-closed                    | `docs/planning/closeouts/20260525-f17g-code-monaco-editable-workspace-access-closeout.md`                                           | None for local editable buffer                           |
| F-21 Execution template workbench            | Evidence-closed                    | `docs/planning/closeouts/20260522-f21-execution-template-source-generation-workbench-closeout.md`                                   | Provider backend generation remains future governed work |
| Artifacts workspace project files            | Implemented with product follow-up | `docs/planning/proposals/mandatory/frontend-and-ux/artifacts-workspace-project-files-plan-20260524.md` and focused Cypress coverage | `F-30-GRAPH-CODE-PARITY`                                 |

## Product Finding

The implemented surface proves three separate behaviors:

- Grafo can persist a preview graph artifact to `pipelines/sales_pipeline.yaml`
  before plan preview.
- Code can read and locally edit workspace files, including
  `pipelines/sales_pipeline.yaml`.
- Artifacts can classify and preview workflow YAML and SQL project artifacts.

The remaining product proof is the cross-route continuity users care about:
the workflow visible in Grafo must be the same project source visible in Code
and the same project artifact visible in Artifacts, through governed workspace
rails and without a stubbed handoff.

## Task Lineage Decision

- Close F-30 as the classification task once DB state and generated views are
  refreshed.
- Create `E/F-30-GRAPH-CODE-PARITY` as the next product task because it is the
  smallest remaining gap between current implementation and the product promise.

## Validation Evidence

- `pnpm planning:db:operate task show --lane E --task F-30`
  - confirmed F-30 as the active classification task.
- `pnpm planning:db:query knowledge-actions --path docs/planning/proposals/mandatory/frontend-and-ux/f17c-artifacts-monaco-readonly-viewer-plan-20260520.md --limit 30`
  - found stale unlinked proposal actions before this review.
- `pnpm planning:db:query knowledge-actions --path docs/planning/proposals/mandatory/frontend-and-ux/f17g-code-monaco-editable-workspace-access-plan-20260520.md --limit 40`
  - found stale unlinked proposal actions before this review.
- `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/CodeView.test.tsx src/app/views/ArtifactsView.test.tsx src/app/views/TemplatesView.test.tsx`
  - passed.
- `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/code/codeMonacoEditableAccess.architecture.test.ts src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts src/app/views/templates/templatesWorkbench.architecture.test.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts src/app/components/monaco/monacoBundleIsolation.architecture.test.ts`
  - passed.
- `pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/code-workbench-workspace-files.cy.ts,cypress/e2e/canvas/artifacts-workspace-project-files.cy.ts,cypress/e2e/templates/templates-workbench.cy.ts`
  - passed.
