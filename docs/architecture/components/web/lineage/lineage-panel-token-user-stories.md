---
title: Lineage Panel Token User Stories
status: Active
owner: Frontend / Lineage
last_reviewed: 2026-05-22
planning_type: architecture
---

# Lineage Panel Token User Stories

## US-F24-LINEAGE-TOKEN-01: Scan Lineage Panels With Shared Workbench Tokens

As an operator, I want Lineage graph, impact, and column panels to use the same
workbench surface language as the rest of the product, so that route panels feel
like one workbench instead of a legacy dashboard.

Acceptance:

- graph, impact, and column panels consume `lineageChromeClasses`;
- local `slate-*` panel chrome does not appear in Lineage panel components;
- panel content remains unchanged.

## US-F24-LINEAGE-TOKEN-02: Preserve Node Semantics While Moving Color Ownership

As an analyst, I want dbt node kinds to keep distinct visual treatments, so that
I can still scan source, model, snapshot, exposure, metric, and macro nodes.

Acceptance:

- `resolveLineageNodeKindClassName` maps node kind to semantic token classes;
- `lineageModel.ts` keeps graph and label semantics instead of owning visual
  color classes;
- unknown node kinds still render with a neutral fallback.

## US-F24-LINEAGE-TOKEN-03: Keep Column Lineage Direction Readable

As an analyst inspecting columns, I want source and target column references to
remain visually distinct, so that the direction of the lineage mapping is clear.

Acceptance:

- source column references use a running/info semantic token;
- target column references use a success semantic token;
- the transition arrow uses muted text treatment.

## Traceability

| Story                   | Primary component     | Guard                                               |
| ----------------------- | --------------------- | --------------------------------------------------- |
| US-F24-LINEAGE-TOKEN-01 | `LineageGraphPanel`   | `lineagePanelTokenConvergence.architecture.test.ts` |
| US-F24-LINEAGE-TOKEN-02 | `lineageChromeTokens` | `lineagePanelTokenConvergence.architecture.test.ts` |
| US-F24-LINEAGE-TOKEN-03 | `LineageColumnPanel`  | `lineagePanelTokenConvergence.architecture.test.ts` |
