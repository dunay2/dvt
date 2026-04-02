---
title: '@dvt/web package surface'
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-02
---

# @dvt/web Package Surface

`@dvt/web` is the package view of the `apps/web` workspace.

Use this page when the question is about frontend module boundaries inside the
workspace rather than the deployable shell as a whole.

## Current Responsibilities

- define client-side service and capability modules;
- hold view-model, store, and capability-level frontend logic;
- expose the package-level structure consumed by the browser application shell;
- keep platform-health and other frontend capabilities isolated from route
  wiring.

## Interface Map

```mermaid
flowchart LR
  Shell["apps/web shell"] --> Package["`@dvt/web` package surface"]
  Package --> Services["API, runs, plans, workspace services"]
  Package --> Capabilities["platform-health and view capabilities"]
```

## Code Anchors

- [createApiClient.ts](../../../../apps/web/src/app/services/api/createApiClient.ts)
- [runsService.ts](../../../../apps/web/src/app/services/runs/runsService.ts)
- [workspaceService.ts](../../../../apps/web/src/app/services/workspace/workspaceService.ts)
- [usePlatformHealthSnapshotQuery.ts](../../../../apps/web/src/capabilities/platform-health/presentation/usePlatformHealthSnapshotQuery.ts)
- [platformHealthCapability.test.ts](../../../../apps/web/src/capabilities/platform-health/application/platformHealthCapability.test.ts)

## Current Posture

This view is useful because the workspace mixes deployable-shell concerns with
package-level modules. The package surface already has meaningful local tests,
but those tests are not yet exposed through a workspace `test` script.

## Planned Delta

- push views to consume service and capability layers instead of mock data
  directly under `F-04`;
- keep package boundaries explicit as the shell cleanup and backend alignment
  work land.

## Historical Deep Dives

- [DDD Structure](web-ddd.md)
- [Functionalities](web-functional.md)
- [Constraints and invariants](web-constraints.md)
- [Sequence diagrams](web-sequence.md)
