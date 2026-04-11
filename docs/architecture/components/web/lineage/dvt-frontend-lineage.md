---
title: Frontend Lineage
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-11
---

# Frontend Lineage

## Purpose

The Lineage surface is the read-only dependency and impact-analysis view of the
DVT frontend.

It should help operators and authors answer:

- what this node depends on;
- what this node affects downstream;
- how wide the impact radius is;
- whether column-level metadata is available.

## Current Implementation

Primary code anchors:

- [LineageView.tsx](../../../../../apps/web/src/app/views/LineageView.tsx)
- [graphStrategyRegistry.ts](../../../../../apps/web/src/app/plugins/graphStrategyRegistry.ts)
- [workspaceService.ts](../../../../../apps/web/src/app/services/workspace/workspaceService.ts)

Current route: `/lineage`

Current behavior:

- loads the workspace graph snapshot;
- maps raw graph nodes and edges into canonical graph entities;
- derives upstream and downstream reachability from a focus node;
- uses an explicit route state model for `loading`, `error`, `empty`, and `ready`;
- renders model-level lineage as layered cards;
- optionally derives lightweight column-level lineage from node metadata;
- degrades column-level mode through a governed metadata-missing state instead of
  inline fallback copy;
- treats zero-match column results separately from missing metadata so the route
  does not misreport available metadata as absent.

## Relationship To Other Views

- it shares graph-source data with Canvas;
- it should accept a focus handoff from Canvas over time;
- it should not duplicate Canvas authoring controls;
- it is the natural place for impact and blast-radius analysis before or after
  using Diff and Runs.

## UX Rules

- the view must start from a bounded focus, not the full graph universe;
- search should be the fastest way to recover context;
- route-level loading must preserve the lineage frame;
- route-level empty state must explain that no lineage focus is available;
- route-level graph-load failures must stay distinct from empty focus;
- column-level lineage should degrade clearly when the necessary metadata is
  absent;
- the view should explain impact through counts and breadcrumbs before asking
  the user to read raw detail.

## Mature Libraries And References

- bounded graph and dependency interactions:
  [React Flow](https://reactflow.dev/)
- analytical dependency and plugin patterns:
  [Backstage](https://github.com/backstage/backstage)

## Current Constraints

- the route is analytic but still relatively shallow compared with the future
  target architecture;
- pin-to-canvas is signaled in the UI but not yet fully realized as a governed
  flow;
- toolbar extraction and richer route controls are still future work;
- the current lineage engine is derived from graph metadata rather than a richer
  lineage-specific backend projection.

## Related Pages

- [Graph Frontend Architecture](../graph/graph-frontend-architecture.md)
- [UX Implementation Guide](../ux-implementation-guide.md)
- [Library And Open-Source Reference Stack](../library-and-open-source-reference-stack.md)
