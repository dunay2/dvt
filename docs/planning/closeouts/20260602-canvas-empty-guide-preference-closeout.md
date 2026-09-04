---
title: Canvas Empty Guide Preference Closeout
status: Superseded
owner: web
last_reviewed: 2026-09-04
planning_type: closeout
---

# Canvas Empty Guide Preference Closeout

## Superseded By GH-2896

The implementation evidenced below was subsequently retired by
[#2896](https://github.com/dunay2/dvt/issues/2896). Once direct toolbar and
contextual authoring became the canonical empty-Canvas interaction, the guide
and its preference were duplicate presentation rather than product capability.
This closeout remains as historical evidence only.

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/frontend-command-query-rail-inventory.md`
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- `docs/architecture/components/web/graph/canvas-layout-persistence-component.md`
- `docs/architecture/components/web/graph/canvas-layout-persistence-user-stories.md`

## Rail Decision

`planning:db:query creation-intent` returned reuse of the existing
`ConfigureCanvasViewportPreferences` command rail for this intent. The slice
therefore extended Canvas viewport preferences instead of creating a parallel
command or settings surface.

## Work Performed

- Added `canvasEmptyStateGuideVisible` to the persisted `uiLayoutStore`.
- Routed the preference through the Canvas controller, shell builders, shell
  graph/chrome contracts, toolbar contribution store, center surface, and typed
  empty-state rendering.
- Added a checkbox in the typed empty-state guide so operators can decide
  whether the guide should keep appearing for newly created typed-empty
  canvases.
- Moved Canvas visual preferences into a `Canvas settings` submenu in the View
  menu and added the same empty-guide toggle there.
- Updated architecture and rail docs to keep the behavior under
  `ConfigureCanvasViewportPreferences`.
- Added unit, architecture, route, and Cypress coverage proving persistence,
  menu restoration, and node-creation availability when the guide is hidden.

## QA Notes

- Initial focused tests failed as expected before implementation because the
  store setter, checkbox, menu contribution, and hidden-guide route behavior did
  not exist.
- Cypress initially exposed two E2E issues:
  - the new test used English-only menu copy while the runtime rendered Spanish
    labels;
  - an existing preview assertion expected obsolete title casing and colonized
    labels that were not present in the source component.
- Both issues were corrected in the E2E spec without changing product behavior.

## Validation Evidence

- `pnpm planning:db:query creation-intent --intent "create a canvas empty state guide preference command" --limit 5` - passed; rail reuse identified.
- `pnpm docs:feature-mechanization -- --feature CANVAS-EMPTY-GUIDE-PREFERENCE-20260602` - passed.
- `pnpm --filter @dvt/web test -- src/app/stores/uiLayoutStore.test.ts src/app/views/canvas/CanvasStateViews.test.tsx src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/Canvas.routeStates.first-canvas-policy.test.tsx` - passed, 27 tests.
- `pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasShell.test.tsx src/app/views/canvas/CanvasShell.architecture.test.tsx src/app/views/canvas/canvasShell.types.architecture.test.ts src/app/views/canvas/canvasShellBuilder.types.architecture.test.ts src/app/views/canvas/canvasShellPropsBuilder.architecture.test.ts src/app/views/canvas/canvasLayoutPersistence.architecture.test.ts` - passed, 20 tests.
- `pnpm --filter @dvt/web typecheck` - passed.
- `pnpm --filter @dvt/web lint` - passed.
- `pnpm --filter @dvt/web test:ci` - passed: unit 136 files / 679 tests, presentation 82 files / 385 tests, architecture 89 files / 241 tests.
- `pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts` - passed, 9 tests.
- `pnpm --filter @dvt/web build` - passed.

## No-Debt And No-Stub Evidence

- No lint, type, test, quality, or hook rule was disabled.
- No hidden debt entry was created or required.
- No stub, placeholder, fake adapter, fake success path, or unfinished TODO was
  added.
- The empty guide preference remains route-local presentation state and does not
  write protected graph draft semantics.
