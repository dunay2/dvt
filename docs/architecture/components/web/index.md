---
title: web component
status: Active
owner: Architecture / Docs
last_reviewed: 2026-05-14
---

# web component

`web` is the canonical component home for the `apps/web` workspace.

It covers both the deployable browser shell and the public package-level
surface consumed inside that workspace. The old `web-app` alias has been moved
out of the active tree.

## Current Responsibilities

- bootstrap the browser application and persistent workbench shell;
- compose route views, plugin-contributed surfaces, and shell-owned routes;
- expose client services for plans, runs, and workspace state;
- map backend runtime and planning responses into operator-facing views.

## Component Decomposition

- shell and bootstrap:
  [Main workspace views and UX](./main-workspace-views-and-ux.md),
  [App bootstrap screen component](./app-bootstrap-screen-component.md),
  [Admin route position component](./admin-route-position-component.md),
  [API client auth component](./api-client-auth-component.md),
  [App shell](./appshell/app-shell.md),
  [Data source service boundary](./appshell/data-source-service-boundary.md)
- graph and authoring surfaces:
  [Graph docs entrypoint](./graph/index.md),
  [Graph frontend architecture](./graph/graph-frontend-architecture.md),
  [Graph route bootstrap architecture](./graph/graph-route-bootstrap-architecture.md),
  [Graph canvas runtime model](./graph/graph-canvas-runtime-model.md),
  [Graph sequences and state machines](./graph/graph-sequences-and-state-machines.md),
  [Graph decision rationale and patterns](./graph/graph-decision-rationale-and-patterns.md),
  [Canvas layout persistence component](./graph/canvas-layout-persistence-component.md),
  [Canvas controller current-to-target](./graph/canvas-controller-current-to-target-architecture.md)
- runtime and run-inspection surfaces:
  [Runs architecture](./runs/dvt-runs-frontend-architecture.md),
  [Frontend runtime contract technical manual](./runs/frontend-runtime-contract-technical-manual.md),
  [Frontend runtime contract user manual](./runs/frontend-runtime-contract-user-manual.md)
- cross-cutting UX:
  [UX implementation guide](./ux-implementation-guide.md),
  [Frontend query boundary component](./frontend-query-boundary-component.md),
  [Frontend test governance component](./frontend-test-governance-component.md),
  [Web Vitest changed suite router component](./web-vitest-changed-suite-router-component.md),
  [Web store domain ownership component](./web-store-domain-ownership-component.md),
  [Workbench UI contract and component inventory](./workbench-ui-contract-and-component-inventory.md),
  [Library and open-source reference stack](./library-and-open-source-reference-stack.md),
  [Plugin Contributions Developer Guide](./plugin-contributions-developer-guide.md)

## Public Operational Surface

- app bootstrap and shell wiring:
  [main.tsx](../../../../apps/web/src/main.tsx),
  [App.tsx](../../../../apps/web/src/app/App.tsx),
  [Root.tsx](../../../../apps/web/src/app/Root.tsx),
  [routes.ts](../../../../apps/web/src/app/routes.ts)
- route-level read and run inspection:
  [RunsView.tsx](../../../../apps/web/src/app/views/RunsView.tsx),
  [RunWorkspaceStateView.tsx](../../../../apps/web/src/app/views/runs/RunWorkspaceStateView.tsx)
- service factories and facades:
  [plansService.ts](../../../../apps/web/src/app/services/plans/plansService.ts),
  [runsService.ts](../../../../apps/web/src/app/services/runs/runsService.ts),
  [workspaceService.ts](../../../../apps/web/src/app/services/workspace/workspaceService.ts),
  [runWorkspaceFacade.ts](../../../../apps/web/src/app/services/runs/runWorkspaceFacade.ts)
- plugin and contribution boundary:
  [Plugin Contributions Developer Guide](./plugin-contributions-developer-guide.md),
  [registry.ts](../../../../apps/web/src/app/plugins/registry.ts)
- frontend test governance:
  [Frontend test governance component](./frontend-test-governance-component.md),
  [Frontend test governance user stories](./frontend-test-governance-user-stories.md),
  [Web Vitest changed suite router component](./web-vitest-changed-suite-router-component.md),
  [Web Vitest changed suite router user stories](./web-vitest-changed-suite-router-user-stories.md),
  [`vitest.suites.ts`](../../../../apps/web/vitest.suites.ts),
  [`test.yml`](../../../../.github/workflows/test.yml)

## Component Topology

```mermaid
flowchart LR
  Browser["Browser"] --> Router["React Router shell"]
  Router --> Views["Canvas, Runs, Cost, and Canvas workbench tabs"]
  Router --> Shell["Plugins and Admin shell routes"]
  Views --> Services["plansService / runsService / workspaceService"]
  Views --> Plugins["plugin registry and node renderers"]
  Services --> Api["apps/api"]
  Plugins --> Api
```

## Current Route Inventory

| Route                   | Main responsibility                                                           |
| ----------------------- | ----------------------------------------------------------------------------- |
| `/`                     | authenticated shell root redirect to the default core view                    |
| `/login`                | public bootstrap route                                                        |
| `/canvas`               | graph workbench and run-start flow                                            |
| `/canvas/:workbenchTab` | Canvas-scoped workbench tabs such as Code, Lineage, Diff, Artifacts, and Runs |
| `/runs`, `/runs/:runId` | run list and run detail inspection                                            |
| `/cost`                 | optional cost dashboard route when the cost plugin is enabled and available   |
| `/plugins`              | plugin management shell view                                                  |
| `/admin`                | shell-owned administrative view                                               |

## Current Posture

This component is real product code. The remaining work is around tightening
service boundaries, removing mock-heavy paths, and aligning route-level flows
with the protected backend contracts. Historical `apps/web/*.md` design and
planning packs have been archived so this page stays the canonical entry point.

## Current Reconciliation Evidence

The active documentation set for `web` is rooted under
`docs/architecture/components/web/**`. Historical `docs/architecture/frontend/**`
references remain archive and closeout context only; they are not the current
component home.

The route inventory above is grounded in `apps/web/src/app/routes.ts` plus
route-bearing plugin contributions in `apps/web/src/app/plugins/**`. Core routes
are registered through the shell router, plugin routes are contributed through
the plugin registry, Canvas workbench tabs are mounted under
`/canvas/:workbenchTab`, and `/login` remains the public bootstrap route.

Runtime run behavior is described through the presentation port in
`apps/web/src/app/ports/runs.ts`, the API adapter in
`apps/web/src/app/services/runs/runsService.api.ts`, and the protected runtime
rail vocabulary in
`apps/api/src/application/ports/protectedRuntimeRunRailVocabulary.ts`.

The current roadmap reference for frontend and UX work is
`docs/planning/proposals/nice-to-have/frontend-and-ux/frontend-roadmap-20260219.md`.
The former `docs/planning/proposals/frontend-roadmap-20260219.md` location is no
longer an active path.

## Related Pages

- [Read subsystem](../../system/subsystems/read/index.md)
- [Canonical run lifecycle subsystem](../../system/subsystems/canonical-run-lifecycle/index.md)
- [DVT Component Map](../../component-map.md)
- [System Delivery Status](../../system-delivery-status.md)
