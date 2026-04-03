---
title: DVT DBT-Agnostic Generalization Plan 2026-04-03
status: Active
owner: Product / Architecture / Delivery
last_reviewed: 2026-04-03
planning_type: proposal
---

# DVT DBT-Agnostic Generalization Plan 2026-04-03

## Product Rule

DVT MUST be dbt-agnostic at the core architecture level.

This means:

- dbt remains a supported graph source and execution specialization
- dbt MUST NOT define the planner's only input model
- dbt MUST NOT define the shared artifact model for every step kind
- dbt MUST NOT define the Temporal execution contract for all workflows

The product goal is multi-workflow orchestration where dbt is one adapter, not
the system identity.

## Problem Summary

Today the planning and execution model still carries dbt-first assumptions in
three critical places:

1. planner entry is materially centered on dbt manifest ingestion
2. step artifacts still assume SQL/dbt output semantics
3. Temporal execution wiring still assumes dbt-shaped step execution

That blocks DVT from becoming a general workflow platform for Python, Spark,
API, ETL, or other graph-defined work.

## Architectural Position

The core architecture must separate these concerns:

- `GenericGraphSource` is the canonical planner input contract
- `ManifestGraphDeriver` is one adapter that produces `GenericGraphSource`
- `StepKindRegistry` governs step validation and adapter routing
- `StepArtifactRef` becomes the generic artifact reference model
- dbt execution remains one specialized StepKind family, not the only runtime

## Before

```mermaid
flowchart LR
    DBT[dbt manifest.json] --> Planner[@dvt/planner]
    Planner --> Plan[ExecutionPlan]
    Plan --> Temporal[Temporal adapter]
    Temporal --> DbtActivity[DbtStepActivity]
```

## After

```mermaid
flowchart LR
    DBT[dbt manifest.json] --> Deriver[ManifestGraphDeriver]
    API[API graph source] --> Generic[GenericGraphSource]
    PY[Python or Spark graph] --> Generic
    Deriver --> Generic
    Generic --> Planner[@dvt/planner]
    Planner --> Plan[ExecutionPlan]
    Plan --> Registry[StepKindRegistry]
    Registry --> Dispatcher[StepActivityDispatcher]
    Dispatcher --> DbtActivity[dbt worker]
    Dispatcher --> PyActivity[python worker]
    Dispatcher --> SparkActivity[spark worker]
```

## Planned Execution Slices

### Slice 1 - Canonical planner input

Primary task:

- `MW-A2`

Outcome:

- `GenericGraphSource` becomes the canonical planner input
- dbt manifest parsing becomes an adapter path into that contract

### Slice 2 - Step-kind governance

Primary tasks:

- `S08-4`
- `MW-A1`

Outcome:

- each `StepKind` has schema validation and routing metadata
- planner and admission stop accepting opaque dbt-shaped config blobs

### Slice 3 - Artifact model generalization

Primary task:

- `MW-A3`

Outcome:

- `compiledCodeRef` becomes `StepArtifactRef`
- dbt SQL artifacts remain supported as one specialization only

### Slice 4 - Execution-layer decoupling

Primary task:

- `MW-C1`

Outcome:

- Temporal runtime dispatches by `StepKind`
- dbt activity implementation stops being the universal execution path

### Slice 5 - Product-facing externalization

Primary tasks:

- `MW-D1`
- `MW-D2`

Outcome:

- external systems can submit non-dbt graph definitions
- worker routing becomes explicit by step kind and capability

## Non-Goals

- removing dbt support
- rewriting the planner around provider-specific engines
- introducing multi-engine runtime work before the step-kind contract is stable

## Acceptance Criteria

- a non-dbt graph can be converted into `ExecutionPlan` without going through
  dbt manifest format
- planner contracts no longer require dbt-specific fields in the shared core
- runtime execution routes by `StepKind`, not by dbt-only activity wiring
- artifact references are step-kind-agnostic
- product documentation describes dbt as one supported source, not the core
  system model

## Related Task Route

- [Lane A](/f:/tercerdvt/dvt/docs/planning/state/agent-lane-a.md)
- [Lane C](/f:/tercerdvt/dvt/docs/planning/state/agent-lane-c.md)
- [Lane D](/f:/tercerdvt/dvt/docs/planning/state/agent-lane-d.md)
- [Deep Architectural Review](/f:/tercerdvt/dvt/docs/planning/reviews/architecture-and-governance/20260402-deep-architectural-review.md)
