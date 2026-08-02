---
title: Frontend Observability Architecture
subtitle: Current shell health, run monitoring, and future operational surfaces
document_type: architecture
status: Active
owner: Frontend / Architecture
last_updated: 2026-08-02
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

Browser-only operability evidence is a separate, subordinate concern. It may
record only closed failure and degraded-state codes that the browser uniquely
observes. It does not become product analytics or a second source of truth for
server-owned outcomes.

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
  [Root.tsx](../../../../../apps/web/src/app/Root.tsx)
- platform-health capability:
  [usePlatformHealthSnapshotQuery.ts](../../../../../apps/web/src/capabilities/platform-health/presentation/usePlatformHealthSnapshotQuery.ts)
- runs detail:
  [RunsView.tsx](../../../../../apps/web/src/app/views/RunsView.tsx),
  [RunStates.tsx](../../../../../apps/web/src/app/views/runs/RunStates.tsx),
  [runWorkspaceFacade.ts](../../../../../apps/web/src/app/services/runs/runWorkspaceFacade.ts)
- cost prototype:
  [CostView.tsx](../../../../../apps/web/src/app/views/CostView.tsx)
- browser operability boundary:
  [frontendOperability.ts](../../../../../apps/web/src/app/ports/frontendOperability.ts),
  [frontendOperabilityRecorder.ts](../../../../../apps/web/src/app/services/operability/frontendOperabilityRecorder.ts)

## Browser Operability Boundary

The Web composition root owns one `FrontendOperabilitySink`. Its initial
production adapter writes structured events to the browser console. Delivery is
best-effort: sink failures are contained and cannot change bootstrap, routing,
commands, queries, parsing, or rendering.

The closed event families are:

- bootstrap failure;
- route-boundary failure;
- rejection by an explicitly instrumented typed response parser;
- transition of an existing surface into a coarse degraded state.

Events may contain only allowlisted route, operation, surface, state, and reason
codes. They must not contain identifiers, route parameters, raw URLs, errors,
stacks, payloads, SQL, paths, user-authored content, plugin metadata, or server
business outcomes. Repeated renders and equal refetches do not produce repeated
events; a new occurrence or coarse-state transition is required.

This boundary is an outbound operational event port, not a command/query rail.
The existing product query rails retain authority over bootstrap readiness,
source-object catalogs, and platform-health presentation.

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
