---
title: F-24 React Flow Token Convergence Closeout
status: Accepted
owner: Web / Canvas
last_reviewed: 2026-05-22
planning_type: closeout
---

# F-24 React Flow Token Convergence Closeout

## Summary

This slice advances `F-24` by moving Canvas React Flow edge palette, plugin node
kind tones, generic graph node chrome, and fallback node chrome behind a named
React Flow graph visual token component. It does not change graph behavior,
plugin registration, node mapping semantics, draft persistence, or Monaco.

## Work Performed

- Added `graphVisualTokens.ts` with graph card classes, status tones, node-kind
  tones, and React Flow edge palette.
- Routed Canvas edge projection through `graphFlowPalette`.
- Routed dbt and DVT node-kind minimap and border tones through
  `resolveGraphNodeKindTone`.
- Routed generic graph and fallback node renderers through `graphVisualClasses`.
- Added component documentation, user stories, and a semantic architecture guard
  for the React Flow graph visual token boundary.

## Red / Green

RED:

```bash
pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
```

Failed because `graphVisualTokens.ts` did not exist.

GREEN:

```bash
pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
pnpm --filter @dvt/web test -- src/app/views/canvas/CanvasViewport.test.tsx
pnpm --filter @dvt/web typecheck
```

Passed after routing graph consumers through the token component.

## Command And Query Rail Impact

No externally observable command or query rail changed. The only new query is an
internal presentation-token helper:

- `resolveGraphNodeKindTone`

## Residual F-24 Work

`F-24` remains open after this slice. Remaining convergence is deeper Monaco
visual-system hardening and additional legacy or plugin surfaces that still
carry route-local color families outside this React Flow graph boundary.

## No Debt

No stubs, placeholders, TODO/FIXME markers, rule downgrades, fake
implementations, or skipped hooks were introduced.
