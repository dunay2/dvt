---
title: Runs Frontend Architecture
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-03
domain: frontend
---

# Runs

## Purpose

The Runs surface is the operational execution workbench of the DVT frontend.

It exists to let operators and authors move from graph intent to execution
evidence without mixing execution truth into the Canvas.

## Current Implementation

Primary code anchors:

- [RunsView.tsx](../../../../apps/web/src/app/views/RunsView.tsx)
- [RunStates.tsx](../../../../apps/web/src/app/views/runs/RunStates.tsx)
- [RunHeader.tsx](../../../../apps/web/src/app/views/runs/RunHeader.tsx)
- [RunTabsContent.tsx](../../../../apps/web/src/app/views/runs/RunTabsContent.tsx)
- [runsService.ts](../../../../apps/web/src/app/services/runs/runsService.ts)

Current routes:

- `/runs`
- `/runs/:runId`

Current composition:

- list state when no `runId` is selected;
- detail header when a run is selected;
- tabbed detail content for timeline, steps, events, metrics, and artifacts.

## UX Rules

- `/runs` is the operational landing state;
- `/runs/:runId` is the focused execution workspace;
- empty state must send the user back to Canvas to create meaningful work;
- event, metrics, and artifact views should feel like one run workspace rather
  than unrelated pages.

## Mature Libraries And References

- operational grids and dense event tables:
  [TanStack Table](https://tanstack.com/table/latest)
- state and polling:
  TanStack Query
- metrics and dashboard patterns:
  [Grafana](https://github.com/grafana/grafana)

## Current Constraints

- the Runs route is useful but still lighter than a full operational table and
  diagnostics workbench;
- the frontend contract around run start and richer diagnostics still needs
  tightening with the protected API route map.

## Related Pages

- [Frontend Observability Architecture](../observability/front-observability-architecture-dvt.md)
- [UX Implementation Guide](../ux-implementation-guide.md)
- [Library And Open-Source Reference Stack](../library-and-open-source-reference-stack.md)
