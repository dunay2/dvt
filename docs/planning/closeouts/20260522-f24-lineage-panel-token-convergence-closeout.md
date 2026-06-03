---
title: F-24 Lineage Panel Token Convergence Closeout
status: Accepted
owner: Web / Lineage
last_reviewed: 2026-05-22
planning_type: closeout
---

# F-24 Lineage Panel Token Convergence Closeout

## Summary

This slice advances `F-24` by moving Lineage route panel presentation classes
behind a Lineage-owned token component. It does not change Lineage graph
traversal, route data loading, shell behavior, React Flow projection, or Monaco
integration.

## Work Performed

- Added `lineageChromeTokens.ts` with the Lineage panel chrome public token API.
- Routed `LineageGraphPanel`, `LineageImpactSummary`, and
  `LineageColumnPanel` through `lineageChromeClasses`.
- Moved node-kind card chrome out of `lineageModel.ts` and into
  `resolveLineageNodeKindClassName`.
- Added component documentation and user stories for the Lineage panel token
  boundary.
- Added an architecture guard that rejects route-level color-family drift in
  the Lineage panel components.

## Red / Green

RED:

```bash
pnpm --filter @dvt/web test -- src/app/views/lineage/lineagePanelTokenConvergence.architecture.test.ts
```

Failed because `lineageChromeTokens.ts` and the local component guide did not
exist.

GREEN:

```bash
pnpm --filter @dvt/web test -- src/app/views/lineage/lineagePanelTokenConvergence.architecture.test.ts
```

Passed: 1 file / 2 tests.

## Command And Query Rail Impact

No externally observable command or query rail changed. The only new query is
an internal presentation-token helper:

- `resolveLineageNodeKindClassName`

## Residual F-24 Work

`F-24` remains open after this slice. Remaining convergence is React Flow
palette hardening, deeper Monaco visual-system hardening, and additional legacy
or plugin surfaces that still carry route-local color families.

## No Debt

No stubs, placeholders, TODO/FIXME markers, rule downgrades, fake
implementations, or skipped hooks were introduced.
