---
title: F-24 Canvas route chrome token convergence closeout
status: Accepted
owner: Web / Canvas
last_reviewed: 2026-05-22
planning_type: closeout
---

# F-24 Canvas Route Chrome Token Convergence Closeout

## Summary

This slice advances `F-24` by moving Canvas route chrome presentation classes
behind a Canvas-owned token component. It does not change Canvas graph behavior,
draft persistence, React Flow configuration, command availability, or Monaco
integration.

## Think-First Analysis

The Runs dense-table F-24 slice already introduced a narrow presentation-token
object. Canvas still had toolbar and tab-strip route chrome using local
`slate-*`, `rose-*`, `amber-*`, and `emerald-*` classes. The root cause was the
same primitive-obsession pattern: route templates encoded color families
directly instead of consuming the operator-workbench semantic variables.

## Work Performed

- Added `canvasChromeTokens.ts` with the Canvas route chrome public token API.
- Routed Canvas toolbar, primary controls, draft status, and replacement tab
  strip chrome through `canvasChromeClasses`.
- Routed workflow and draft-status tone classes through token helper queries.
- Added component documentation and user stories for the Canvas route chrome
  token boundary.
- Added an architecture guard that rejects route-level color-family drift in
  the Canvas toolbar and tab strip.

## Red / Green

RED:

```bash
pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
```

Failed because `canvasChromeTokens.ts` did not exist.

GREEN:

```bash
pnpm --filter @dvt/web test -- src/app/views/canvas/canvasRoutePosturePriority.architecture.test.ts
```

Passed: 1 file / 5 tests.

Focused regression:

```bash
pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasToolbar.test.tsx src/app/views/canvas/CanvasToolbar.architecture.test.tsx src/app/views/canvas/CanvasPlaygroundTabStrip.test.tsx src/app/views/canvas/canvasToolbarViewModel.test.ts
```

Passed: 4 files / 15 tests.

## Command And Query Rail Impact

No externally observable command or query rail changed. The only new query is
an internal presentation-token helper:

- `resolveCanvasDraftStatusClassName`
- `resolveCanvasWorkflowStatusClassName`

## Residual F-24 Work

`F-24` remains open after this slice. Remaining convergence is broader panel,
legacy component, React Flow palette, and Monaco visual-system hardening across
the rest of the operator path.

## No Debt

No stubs, placeholders, TODO/FIXME markers, rule downgrades, fake
implementations, or skipped hooks were introduced.
