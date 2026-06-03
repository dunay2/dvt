---
title: F-17-D Templates Monaco Preview Closeout
status: Accepted
date: 2026-05-22
owners:
  - apps/web
planning_type: closeout
---

# F-17-D Templates Monaco Preview Closeout

## Outcome

Templates now renders ready generated source through a route-local read-only
Monaco preview panel. The route still owns catalog selection, parameter state,
validation, and deterministic source generation; Monaco only owns inspection.

## Work Performed

- Added `TemplateMonacoPreviewPanel` as the Templates generated-source
  presentation adapter.
- Updated `TemplatesRouteWorkbench` to delegate ready previews to the Monaco
  panel while keeping blocked previews in the existing validation state.
- Added render and architecture tests for read-only Monaco preview semantics.
- Added component guide, user stories, Fowler analysis, and feature plan for
  F-17-D.

## TDD Evidence

- Red: `TemplateMonacoPreviewPanel.test.tsx` failed because the panel did not
  exist.
- Red: `templatesMonacoPreview.architecture.test.ts` failed because Templates
  did not have a route-local Monaco preview panel.
- Green: both tests passed after extracting the panel and delegating from the
  workbench.

## Validation

- `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/templates/TemplateMonacoPreviewPanel.test.tsx`
  - passed.
- `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesMonacoPreview.architecture.test.ts`
  - passed.
- `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx`
  - passed.

## No Debt / No Stubs

- No fake export, apply, save, or dispatch command was added.
- No backend contracts, adapters, engine, planner, or API surfaces were changed.
- No lint, type, test, hook, or governance rule was relaxed.
- No placeholder implementation was introduced.

## Remaining Work

F-17 still needs parent-level closure for bundle posture and any backend-backed
Diff/Templates convergence that requires real query rails.
