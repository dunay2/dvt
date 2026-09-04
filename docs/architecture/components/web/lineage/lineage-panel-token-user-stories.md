---
title: Lineage Panel Token User Stories
status: Active
owner: Frontend / Lineage
last_reviewed: 2026-09-04
planning_type: architecture
---

# Lineage Panel Token User Stories

## US-F24-LINEAGE-TOKEN-01: Scan Lineage Panels With Shared Workbench Tokens

As an operator, I want the current Lineage graph and impact panels to use the same workbench surface language as the rest of the product, so that the route feels like one workbench instead of a legacy dashboard.

Acceptance:

- graph and impact panels consume `lineageChromeClasses`;
- local `slate-*` panel chrome does not appear in current Lineage route panel components;
- graph-level lineage/impact content remains unchanged;
- the route does not reintroduce a matched-column panel as a second field-lineage authority.

## US-F24-LINEAGE-TOKEN-02: Preserve Node Semantics While Moving Color Ownership

As an analyst, I want node kinds to keep distinct visual treatments, so that I can still scan source, model, snapshot, exposure, metric, and macro nodes.

Acceptance:

- `resolveLineageNodeKindClassName` maps node kind to semantic token classes;
- `lineageModel.ts` keeps graph traversal and label semantics instead of owning visual color classes;
- unknown node kinds still render with a neutral fallback;
- field lineage, when available, is projected by the single Canvas from stable references rather than inferred in this route.

## Traceability

| Story                   | Primary component     | Guard                                               |
| ----------------------- | --------------------- | --------------------------------------------------- |
| US-F24-LINEAGE-TOKEN-01 | `LineageGraphPanel`   | `lineagePanelTokenConvergence.architecture.test.ts` |
| US-F24-LINEAGE-TOKEN-02 | `lineageChromeTokens` | `lineagePanelTokenConvergence.architecture.test.ts` |
