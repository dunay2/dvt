---
title: Start-run runtime composition component
status: Active
owner: apps/api
last_reviewed: 2026-04-24
---

# Start-run runtime composition component

This local guide documents the `apps/api` subcomponent that assembles the
authenticated start-run chain inside the protected runtime module.

It does not own transport parsing, shared contracts, or provider adapter
construction. It owns only the composition seam that binds already-resolved
runtime dependencies into the start-run facade and use-case chain.

Read this together with:

- `apps/api/docs/start-run-application-component.md`
- `apps/api/docs/start-run-execution-capacity-admission-component.md`
- `apps/api/docs/start-run-admission-observability-component.md`
- `apps/api/docs/executable-subgraph-resolution-component.md`
- `docs/architecture/components/api/protected-runtime-and-plan-compile-component.md`

## Owned concern

The component owns exactly one concern:

- assemble the authenticated start-run runtime chain from abstract runtime
  dependencies already resolved by the protected composition root

It does **not** own:

- HTTP request parsing
- canonical shared command/result vocabulary
- provider adapter construction
- state-store and plan-store construction
- workspace-graph draft composition

The outer protected runtime root may still bind concrete execution-capacity
probes before handing the abstract port into this component. That binding
belongs to the protected-runtime dependency builders, not to `startRun`.

## Public API

- `buildProtectedStartRunRuntime.ts`
  Builder:
  `buildProtectedStartRunRuntime(...)`,
  `BuildProtectedStartRunRuntimeDeps`,
  `ProtectedStartRunRuntime`

## Invariants

- `buildProtectedRuntimeModule.ts` remains the top-level protected composition
  root for `apps/api`
- `buildProtectedStartRunRuntime.ts` is the only module in the protected
  runtime component allowed to construct:
  `StartRunAuthorizedFacade`,
  `BackpressureAwareStartRunUseCase`,
  `PlannerBackedStartRunUseCase`,
  `ResolveAuthorizedExecutableSubgraphService`,
  `EngineStartRunUseCase`,
  and `StoredPlanExecutabilityValidator`
- the outer composition root passes abstract runtime dependencies into this
  builder; it does not reconstruct the start-run chain itself
- the outer composition root may bind a concrete execution-capacity probe, but
  it passes only the abstract `IStartRunExecutionCapacityPort` into this
  builder
- compile-planner construction for the authenticated start-run path lives in
  this subcomponent, not back in the outer root
- the fail-closed default execution-capacity binding stays inside start-run
  composition, not inside `BackpressureAwareStartRunUseCase.ts`

## Component map

```mermaid
flowchart LR
  Root["buildProtectedRuntimeModule.ts"] --> StartRunRuntime["buildProtectedStartRunRuntime.ts"]
  Root --> Binding["buildProtectedExecutionCapacityPort.ts"]
  Binding --> StartRunRuntime
  StartRunRuntime --> Facade["StartRunAuthorizedFacade"]
  StartRunRuntime --> Admission["BackpressureAwareStartRunUseCase"]
  StartRunRuntime --> Planner["PlannerBackedStartRunUseCase"]
  StartRunRuntime --> Resolver["ResolveAuthorizedExecutableSubgraphService"]
  StartRunRuntime --> Engine["EngineStartRunUseCase"]
  StartRunRuntime --> Validator["StoredPlanExecutabilityValidator"]
  StartRunRuntime --> Compile["buildPlanCompilePlanner()"]
  StartRunRuntime --> Capacity["DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT"]
```

## Transitions

```mermaid
sequenceDiagram
  participant Root as buildProtectedRuntimeModule
  participant Binding as buildProtectedExecutionCapacityPort
  participant StartRun as buildProtectedStartRunRuntime
  participant Facade as StartRunAuthorizedFacade
  participant Admission as BackpressureAwareStartRunUseCase
  participant Planner as PlannerBackedStartRunUseCase
  participant Resolver as ResolveAuthorizedExecutableSubgraphService
  participant Engine as EngineStartRunUseCase

  Root->>StartRun: pass authenticator, authorizer, engine, adapters, stores, telemetry deps
  Root->>Binding: resolve concrete capacity probe from env + runtime posture
  Binding-->>Root: abstract IStartRunExecutionCapacityPort
  StartRun->>StartRun: bind plan validator + compile planner
  StartRun->>Engine: construct execution delegate
  StartRun->>Resolver: bind protected workspace-graph draft store + planner
  StartRun->>Planner: construct planner-backed delegate
  StartRun->>Admission: construct admission use case
  StartRun->>Facade: construct authenticated facade
  StartRun-->>Root: facade + planner + compile planner + validator
```

## Consumers

- `apps/api/src/modules/buildProtectedRuntimeModule.ts`
- `apps/api/src/modules/protectedRuntime/buildProtectedExecutionCapacityPort.ts`
- `apps/api/docs/start-run-application-component.md`
- `apps/api/docs/start-run-execution-capacity-admission-component.md`
- `apps/api/test/modules/startRunRuntimeComposition.cases.ts`
- `apps/api/test/application/services/startRunExecutionCapacityAdmission.architecture.test.ts`
