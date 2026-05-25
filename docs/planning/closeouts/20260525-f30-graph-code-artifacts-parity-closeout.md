---
title: F-30 Graph Code Artifacts Project Source Parity Closeout
status: Review
date: 2026-05-25
owners:
  - apps/web
planning_type: closeout
featureId: F30-GRAPH-CODE-ARTIFACTS-PARITY-20260525
---

# F-30 Graph Code Artifacts Project Source Parity Closeout

## Summary

F-30 is implemented and ready for integration review, not yet presented as a
cleanly closed slice because the current worktree also contains earlier
planning-reconciliation changes.

The product proof now covers the user path that matters: a graph workflow is
planned in Grafo, persisted as a governed workspace artifact, opened as the
same project source in Code, and classified as the same project artifact in
Artifacts.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/f30-graph-code-artifacts-project-source-parity-plan-20260525.md`

## Work Performed

- Added a Cypress user proof for Canvas Grafo to Code and Artifacts parity.
- Invalidated workspace file tree, workspace file content, and artifact query
  caches after a successful graph artifact save.
- Added local Vite-bundled Monaco worker configuration so Code and Artifacts do
  not depend on `cdn.jsdelivr.net` worker loading.
- Declared `monaco-editor` as a direct `@dvt/web` dependency because the web
  workspace imports Monaco runtime modules for local workers.
- Hardened Monaco bundle isolation docs and architecture tests for direct
  dependency ownership and local worker loading.

## Validation Evidence

- `pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-graph-code-artifacts-parity.cy.ts`
  - passed.
- `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasExecutionActions.planPreview.core.test.tsx`
  - passed.
- `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/useCanvasExecutionActions.architecture.test.ts src/app/views/code/codeMonacoEditableAccess.architecture.test.ts src/app/views/artifacts/artifactsMonacoReadonlyViewer.architecture.test.ts`
  - passed.
- `pnpm --filter @dvt/web exec vitest run --config vitest.monaco.config.ts src/app/components/monaco/monacoBundleIsolation.architecture.test.ts`
  - passed.
- `pnpm --filter @dvt/web typecheck`
  - passed.
- `pnpm --filter @dvt/web lint`
  - passed.
- `pnpm docs:feature-mechanization -- --feature F30-GRAPH-CODE-ARTIFACTS-PARITY-20260525`
  - passed.
- `pnpm docs:feature-mechanization:implementation`
  - passed across the current combined worktree.
- `pnpm docs:feature-mechanization:implementation -- --feature F30-GRAPH-CODE-ARTIFACTS-PARITY-20260525`
  - failed because unrelated planning-reconciliation files are already dirty in
    the same worktree and are outside the F-30 selected manifest.

## Integration Caveat

The failing selected implementation gate is a slice-isolation problem, not a
known product regression in the F-30 flow. F-30 should be integrated only after
the current planning-reconciliation changes are either separated into their own
slice or committed under their owning feature manifests.

## No Debt / No Stubs

- No fake Code or Artifacts handoff was added; the Cypress flow reuses the same
  captured workspace artifact content across save, file read, and artifact
  preview.
- No lint, type, test, or governance rule was relaxed.
- No stub, placeholder, fake adapter, direct graph-draft seeding, or hidden
  success path was introduced.
