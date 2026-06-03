---
title: F-24 dbt Node Renderer Token Convergence Closeout
status: Accepted
owner: Web / Canvas
last_reviewed: 2026-05-22
planning_type: closeout
---

# F-24 dbt Node Renderer Token Convergence Closeout

## Summary

This slice moves the dbt plugin node renderer's graph chrome and inspector
status badge classes behind the React Flow visual token component. It does not
change dbt node behavior, runtime queries, inspector panel visibility, or
Monaco.

## Work Performed

- Extended `graphVisualTokenConvergence.architecture.test.ts` to cover
  `DbtNodeRenderer.tsx`.
- Added `graphStatusBadgeClasses` and dbt inspector chrome classes to
  `graphVisualTokens.ts`.
- Routed dbt node card, status dot/ring, tags, column rows, inspector cards,
  SQL/config code blocks, and muted history states through graph tokens.
- Updated the React Flow visual token component guide to name the dbt renderer
  as a governed consumer.

## Red / Green

RED:

```bash
pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
```

Failed because `DbtNodeRenderer.tsx` did not import `graphVisualTokens` and
still owned local graph visual color families.

GREEN:

```bash
pnpm --filter @dvt/web test -- src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts
```

Passed after routing dbt renderer chrome through the token component.

## Residual F-24 Work

`F-24` remains open for deeper Monaco visual-system hardening and any remaining
route-local color families outside the graph renderer boundary.

## No Debt

No stubs, placeholders, TODO/FIXME markers, rule downgrades, fake
implementations, or skipped hooks were introduced.
