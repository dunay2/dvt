---
title: F-17-C Artifacts Monaco Read-Only Viewer Closeout
status: Accepted
date: 2026-05-25
owners:
  - apps/web
planning_type: closeout
---

# F-17-C Artifacts Monaco Read-Only Viewer Closeout

## Summary

F-17-C is closed as implemented. Artifacts owns a read-only Monaco preview
adapter for imported and workspace-backed artifact documents, and the route
does not expose a file mutation command.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/f17c-artifacts-monaco-readonly-viewer-plan-20260520.md`

## Work Verified

- `ArtifactMonacoPreviewPanel` exists as the read-only presentation adapter.
- `ArtifactsView` renders imported dbt artifacts and workspace project
  artifacts through preview tabs.
- Architecture tests guard the Artifacts route against writable Monaco
  semantics, backend API drift, and duplicated artifact endpoints.

## Validation Evidence

- `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/CodeView.test.tsx src/app/views/ArtifactsView.test.tsx src/app/views/TemplatesView.test.tsx`
  - passed.
- `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/code/codeMonacoEditableAccess.architecture.test.ts src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts src/app/views/templates/templatesWorkbench.architecture.test.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts src/app/components/monaco/monacoBundleIsolation.architecture.test.ts`
  - passed.
- `pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/code-workbench-workspace-files.cy.ts,cypress/e2e/canvas/artifacts-workspace-project-files.cy.ts,cypress/e2e/templates/templates-workbench.cy.ts`
  - passed.

## Disposition

- The original F-17-C proposal actions are evidence-closed.
- No successor implementation task is required for the read-only Monaco viewer
  boundary.
- Product parity between authored graph workflow files and what Code/Artifacts
  show remains a separate F-30 successor concern.

## No Debt / No Stubs

- No backend artifact API, writable artifact path, placeholder modal, or fake
  command rail was introduced.
- No lint, type, test, or governance rule was relaxed.
