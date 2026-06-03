---
title: F-17-G Code Monaco Editable Workspace Access Closeout
status: Accepted
date: 2026-05-25
owners:
  - apps/web
planning_type: closeout
---

# F-17-G Code Monaco Editable Workspace Access Closeout

## Summary

F-17-G is closed as implemented. Code is available beside Grafo in the Canvas
workbench, reads workspace files through governed query rails, and owns a
route-local editable Monaco buffer without claiming persistence authority.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/f17g-code-monaco-editable-workspace-access-plan-20260520.md`

## Work Verified

- Code uses `ListWorkspaceFiles` and `GetWorkspaceFileContent` as query rails.
- `MonacoCodeEditor` and `CodeEditableBuffer` provide local editable state.
- The Canvas tab strip exposes Code before a canvas document exists.
- Cypress proves a user can open Code beside Grafo and type in Monaco.

## Validation Evidence

- `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/CodeView.test.tsx src/app/views/ArtifactsView.test.tsx src/app/views/TemplatesView.test.tsx`
  - passed.
- `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/code/codeMonacoEditableAccess.architecture.test.ts src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts src/app/views/templates/templatesWorkbench.architecture.test.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts src/app/components/monaco/monacoBundleIsolation.architecture.test.ts`
  - passed.
- `pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts src/app/views/code/codeViewFileSelection.test.ts src/app/views/code/useCodeEditableBuffer.test.tsx src/app/views/artifacts/useArtifactsViewModel.test.tsx`
  - passed for `templatesViewModel.test.ts` and
    `codeViewFileSelection.test.ts`; the unit config did not select the other
    two paths.
- `pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/code-workbench-workspace-files.cy.ts,cypress/e2e/canvas/artifacts-workspace-project-files.cy.ts,cypress/e2e/templates/templates-workbench.cy.ts`
  - passed.

## Disposition

- The original F-17-G proposal actions are evidence-closed.
- Saving edited files remains out of scope and no `SaveWorkspaceFileContent`
  rail was introduced.
- The remaining product gap is not local Code typing; it is proving that the
  workflow visible in Grafo is the same project artifact visible in Code and
  Artifacts.

## No Debt / No Stubs

- No save command, backend write endpoint, fake persistence path, or hidden
  file-write success state was introduced.
- No lint, type, test, or governance rule was relaxed.
