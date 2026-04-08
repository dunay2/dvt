---
title: planner Build Sequence
status: Active
owner: Planning Domain / Architecture
last_reviewed: 2026-04-08
---

# planner Build Sequence

## Current `buildPlan()` flow

```mermaid
sequenceDiagram
  participant Caller as API or integrator
  participant Facade as PlannerFacade
  participant Resolver as IGraphSourceResolver
  participant Mapper as PlannerEnvelopeMapper
  participant Planner
  participant Validator as InputEnvelopeValidator
  participant Graph as GraphBuilder
  participant Selector as NodeSelector
  participant Registry as IStepTypeRegistry
  participant Assembler as PlanAssembler

  Caller->>Facade: buildPlan(contract input)
  opt manifestRef path
    Facade->>Resolver: resolveGraphSource(manifestRef)
    Resolver-->>Facade: graphSource
  end
  Facade->>Mapper: map contract input
  Facade->>Planner: buildPlan(domain input)
  Planner->>Validator: validate(input)
  Planner->>Graph: execute(command)
  Graph-->>Planner: dependency graph
  Planner->>Selector: execute(selection)
  Selector-->>Planner: selected graph
  Planner->>Registry: validate(kind, stepTypeConfig)
  Registry-->>Planner: success or error
  Planner->>Assembler: execute(command)
  Assembler-->>Planner: PlannerBuildResultV1
  Planner-->>Facade: build result
  Facade-->>Caller: canonical plan artifact
```

## Boundary note

Planner stops at canonical plan construction. Runtime compatibility validation,
stored-plan lifecycle, and execution dispatch belong to API, verifier, and
engine surfaces, not to the planner package itself.

## Current code anchors

- [PlannerFacade.ts](../../../../packages/@dvt/planner/src/application/PlannerFacade.ts)
- [PlannerEnvelopeMapper.ts](../../../../packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts)
- [IGraphSourceResolver.ts](../../../../packages/@dvt/planner/src/ports/IGraphSourceResolver.ts)
- [Planner.ts](../../../../packages/@dvt/planner/src/domain/Planner.ts)
- [GraphBuilder.ts](../../../../packages/@dvt/planner/src/domain/graph/GraphBuilder.ts)
- [NodeSelector.ts](../../../../packages/@dvt/planner/src/domain/NodeSelector.ts)
- [PlanAssembler.ts](../../../../packages/@dvt/planner/src/domain/PlanAssembler.ts)

## Canonical references

- [Planner component entry](index.md)
- [Planner contracts](../../../contracts/planner/index.md)
- [Planner current state assessment](../../../planning/status/planner-current-state-assessment.md)
