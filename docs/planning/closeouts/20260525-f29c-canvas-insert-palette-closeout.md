---
title: F-29-C Canvas Insert Palette Closeout
status: Accepted
date: 2026-05-25
owners:
  - apps/web
planning_type: closeout
---

# F-29-C Canvas Insert Palette Closeout

## Summary

`E/F-29-C` closes the Canvas Add/Insert palette product gap without adding a
second permanent navigation rail. Empty canvases and active canvases now use the
same on-demand, searchable node palette, with keyboard navigation and insertion
through the existing Canvas graph command boundary.

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-shell-save-export-sequence-plan-20260505.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md`

## Work Performed

- Added `CanvasAddNodePalette` as an on-demand node insertion surface.
- Replaced the empty-canvas permanent node list with the palette trigger.
- Wired active-canvas Insert through `CanvasToolbar` and
  `CanvasToolbarPrimaryControls`.
- Passed the existing authoring command through `CanvasShellMainPanel` instead
  of creating a parallel command surface.
- Added English and Spanish copy for Insert, search, and empty search states.
- Updated Canvas Cypress flows that previously clicked direct node buttons.
- Added presentation tests proving search, keyboard insertion, and the absence
  of a permanent node rail.

## Validation Evidence

- `pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/CanvasStateViews.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx`
- `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/CanvasToolbar.architecture.test.tsx src/app/views/canvas/canvasShell.types.architecture.test.ts src/app/views/canvas/canvasShellPropsBuilder.architecture.test.ts`
- `pnpm --filter @dvt/web test:e2e:native -- --spec 'cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts,cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts'`
- `pnpm --filter @dvt/web test:e2e:native -- --spec 'cypress/e2e/canvas/canvas-first-authoring-live.cy.ts'`
- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web lint`

The first live-protected Cypress spec compiled and reported its two tests as
pending because the live protected runtime is not enabled in this local run.
The stubbed browser proof passed 9/9 assertions.

Browser-plugin verification was attempted against `http://127.0.0.1:5173/canvas`;
the in-app browser was unavailable in this session and the fallback Playwright
browser process could not launch. Cypress remains the browser evidence for this
closeout.

## Debt And Stub Check

- No new debt entry was created.
- No lint, type, test, docs, hook, or quality rule was disabled or relaxed.
- No hooks were bypassed.
- No stub, placeholder, fake adapter, fake success path, TODO marker, or
  unfinished runtime branch was introduced.

## Outcome

Canvas now exposes node creation as a task-focused Insert/Add command instead
of another always-visible bar. The next Lane E product work can move back to the
reconciliation queue once this implementation is committed and the planning DB
state is closed.
