---
title: Frontend Observability Architecture
subtitle: Current shell health, run monitoring, and future operational surfaces
document_type: architecture
status: Active
owner: Frontend / Architecture
last_updated: 2026-04-03
language: en
---

# Frontend Observability Architecture

## Purpose

Frontend observability in DVT is not browser click analytics.

It is the operator-facing read surface for:

- platform health;
- run status and progress;
- execution evidence;
- cost and performance signals when available;
- degraded or stale-data warnings.

## Current Reality

The current observability story is split across three real surfaces:

1. shell-level platform health in the top bar and health banner;
2. run observability inside `/runs` and `/runs/:runId`;
3. a non-routed `CostView` implementation that shows where richer operational
   dashboards may evolve next.

There is no active top-level observability route in the shell today. The
documentation must reflect that instead of describing a dashboard that does not
exist yet.

## Current Code Anchors

- shell probes and banner:
  [Root.tsx](../../../../apps/web/src/app/Root.tsx)
- platform-health capability:
  [usePlatformHealthSnapshotQuery.ts](../../../../apps/web/src/capabilities/platform-health/presentation/usePlatformHealthSnapshotQuery.ts)
- runs detail:
  [RunsView.tsx](../../../../apps/web/src/app/views/RunsView.tsx),
  [RunStates.tsx](../../../../apps/web/src/app/views/runs/RunStates.tsx),
  [runWorkspaceFacade.ts](../../../../apps/web/src/app/services/runs/runWorkspaceFacade.ts)
- cost prototype:
  [CostView.tsx](../../../../apps/web/src/app/views/CostView.tsx)

## UX Rules

- shell health must be visible without entering a dedicated diagnostics route;
- run metrics belong with the active run workspace, not hidden behind separate
  operational navigation for now;
- degraded probes, stale state, and partial refreshes must be shown explicitly;
- observability must remain read-only and evidence-oriented.

## Mature Libraries And References

- metrics and dashboard precedent:
  [Grafana](https://github.com/grafana/grafana)
- dense operational tables:
  [TanStack Table](https://tanstack.com/table/latest)
- future live log or console surface:
  [xterm.js](https://xtermjs.org/)
- existing lightweight charting in code:
  Recharts

The correct approach is to reuse mature charting, terminal, and observability
patterns rather than inventing custom dashboard primitives.

## Current Constraints

- observability is real, but fragmented across shell health and the Runs route;
- there is no governed dedicated observability route yet;
- much richer operational telemetry still depends on backend and contract
  maturity that is not complete.

## Related Pages

- [Runs](../runs/dvt-runs-frontend-architecture.md)
- [UX Implementation Guide](../ux-implementation-guide.md)
- [Library And Open-Source Reference Stack](../library-and-open-source-reference-stack.md)
