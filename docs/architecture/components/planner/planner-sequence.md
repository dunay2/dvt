---
title: planner Build Sequence
status: Active
owner: Planning Domain / Architecture
last_reviewed: 2026-04-07
---

# planner Build Sequence

## Current `buildPlan()` flow

```mermaid
sequenceDiagram
  participant Caller as API or integrator
  participant Facade as PlannerFacade
  participant Resolver as IArtifactResolver
  participant Mapper as PlannerEnvelopeMapper
  participant Planner
  participant Validator as InputEnvelopeValidator
  participant Deriver as Manifest derivation
  participant Graph as GraphBuilder
  participant Selector as NodeSelector
  participant Assembler as PlanAssembler

  Caller->>Facade: buildPlan(contract input)
  opt referenced graph artifact
    Facade->>Resolver: resolveGraphSource(manifestRef or artifact ref)
    Resolver-->>Facade: graphSource
  end
  Facade->>Mapper: map contract input
  Facade->>Planner: buildPlan(domain input)
  Planner->>Validator: validate(input)
  opt manifest compatibility path
    Planner->>Deriver: derivePlannerGraphSourceFromManifest(...)
    Deriver-->>Planner: graphSource
  end
  Planner->>Graph: execute(command)
  Graph-->>Planner: dependency graph
  Planner->>Selector: execute(selection)
  Selector-->>Planner: selected graph
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

- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts`
- `packages/@dvt/planner/src/application/derivePlannerGraphSourceFromManifest.ts`
- `packages/@dvt/planner/src/domain/Planner.ts`
- `packages/@dvt/planner/src/domain/graph/GraphBuilder.ts`
- `packages/@dvt/planner/src/domain/NodeSelector.ts`
- `packages/@dvt/planner/src/domain/PlanAssembler.ts`

## Canonical references

- [Planner component entry](index.md)
- [Planner contracts](../../../contracts/planner/index.md)
- [Planner current state assessment](../../../planning/status/planner-current-state-assessment-20260320.md)
