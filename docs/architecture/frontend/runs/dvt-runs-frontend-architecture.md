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
- [runWorkspaceFacade.ts](../../../../apps/web/src/app/services/runs/runWorkspaceFacade.ts)
- [runsService.ts](../../../../apps/web/src/app/services/runs/runsService.ts)

Current routes:

- `/runs`
- `/runs/:runId`

Current composition:

- list state when no `runId` is selected;
- workspace detail state when a run is selected;
- snapshot card is always present;
- timeline card is available, empty, or degraded based on runtime events.

## UX Rules

- `/runs` is the operational landing state;
- `/runs/:runId` is the focused execution workspace;
- empty state must send the user back to Canvas to create meaningful work;
- the route must never fabricate step/artifact detail from snapshot-only data.

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

## Runtime Contract Baseline (F-07)

The route-level runtime drift addressed by `F-07` is now fixed in the service
layer:

- frontend runtime routes now align to protected route truth:
  - `POST /runs/start`
  - `GET /runs`
  - `GET /runs/:runId`
  - `GET /runs/:runId/events`

Current residual constraint after that fix:

- `/runs/:runId` is backed by runtime snapshot authority, not by a full
  event-enriched and step-enriched run aggregate;
- timeline is route-composed when available, but step/artifact/node detail
  still need the later `F-09` through `F-11` convergence work.

Canonical runtime contract baseline docs:

- [Frontend Runtime Contract Technical Manual](frontend-runtime-contract-technical-manual.md)
- [Frontend Runtime Contract User Manual](frontend-runtime-contract-user-manual.md)
- [Frontend Fowler Implementation Pattern](../frontend-fowler-implementation-pattern.md)
- [F-07 Frontend Runtime Contract Baseline Plan](../../../planning/proposals/mandatory/runtime-and-contracts/f-07-frontend-runtime-contract-baseline-plan-20260404.md)

## Related Pages

- [Frontend Observability Architecture](../observability/front-observability-architecture-dvt.md)
- [UX Implementation Guide](../ux-implementation-guide.md)
- [Library And Open-Source Reference Stack](../library-and-open-source-reference-stack.md)
