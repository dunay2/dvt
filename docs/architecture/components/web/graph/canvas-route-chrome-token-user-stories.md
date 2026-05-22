---
title: Canvas route chrome token user stories
status: Active
owner: Web / Canvas
last_reviewed: 2026-05-22
domain: frontend
---

# Canvas Route Chrome Token User Stories

## US-F24-CANVAS-CHROME-01: Scan Toolbar Commands With Workbench Tokens

As an operator, I need Canvas toolbar commands to use the same workbench visual
language as the rest of the app, so I can scan project export, import, plan,
and run commands without route-specific color drift.

Acceptance:

- Toolbar container, separators, command buttons, and workflow badges consume
  `canvasChromeClasses`.
- Visual token changes do not alter command enablement or click behavior.

## US-F24-CANVAS-CHROME-02: Read Draft Posture Without Local Color Rules

As a frontend maintainer, I need draft status and recovery badges to resolve
through one token helper, so draft-save posture does not duplicate warning and
danger color classes in route components.

Acceptance:

- `CanvasToolbarDraftStatus` uses `resolveCanvasDraftStatusClassName`.
- `canvasToolbarViewModel` uses `resolveCanvasWorkflowStatusClassName`.

## US-F24-CANVAS-CHROME-03: Keep Tab Strip Chrome Separate From Canvas Policy

As a Canvas route maintainer, I need tab-strip visual chrome to use a token
component while replacement policy stays in the presenter/model, so F-24 remains
visual-system convergence rather than command-policy refactoring.

Acceptance:

- `CanvasPlaygroundTabStrip.templates.tsx` uses `canvasChromeClasses`.
- The token component does not import route command, graph, or draft state
  types.

## Scenario Coverage Matrix

| Story                     | Surface                                              | Guard                                             |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------- |
| `US-F24-CANVAS-CHROME-01` | `CanvasToolbar`, `CanvasToolbarPrimaryControls`      | `canvasRoutePosturePriority.architecture.test.ts` |
| `US-F24-CANVAS-CHROME-02` | `CanvasToolbarDraftStatus`, `canvasToolbarViewModel` | `canvasRoutePosturePriority.architecture.test.ts` |
| `US-F24-CANVAS-CHROME-03` | `CanvasPlaygroundTabStrip.templates.tsx`             | `canvasRoutePosturePriority.architecture.test.ts` |
