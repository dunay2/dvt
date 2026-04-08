---
title: planner-aggregates Functionalities
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-28
---

# planner-aggregates Functionalities

## Functionalities

| #   | Functionality                   | Description                                                                                                                         |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Plan Structure Management       | PlanAggregate tracks the overall structure of a plan, including all registered steps and their declared dependencies.               |
| 2   | Dependency Graph Construction   | GraphBuilder constructs and validates a directed acyclic graph (DAG) from step definitions, rejecting cycles immediately.           |
| 3   | Topological Step Ordering       | TopoSort produces a valid execution sequence from the dependency graph, ensuring steps are run in dependency-respecting order.      |
| 4   | Step Definition and Linking     | StepAggregate defines the logic, parameters, and type (`task` or `gateway`) for each step and links it to its dependencies.         |
| 5   | Constraint Enforcement          | ValidationAggregate checks that all steps meet required parameter definitions, business rules, and policy requirements.             |
| 6   | Plan Assembly                   | PlanAssembler assembles the final `ExecutionPlanV2`, computing content-addressable hashes and attaching metadata.                   |
| 7   | Lifecycle Coordination          | PlanAggregate gates lifecycle transitions (draft → compiled → validated), ensuring each state requires the prior state to be valid. |
| 8   | Manifest-Driven Node Derivation | ManifestGraphDeriver derives additional graph nodes from external manifests, enabling manifest-sourced plan inputs.                 |

## Main Methods

- `Planner.buildDependencyGraph()`: Delegates to GraphBuilder to construct and validate the step DAG.
- `GraphBuilder.build(steps)`: Constructs the full dependency graph from a list of step definitions.
- `GraphBuilder.detectCycles(graph)`: Verifies the graph is acyclic; raises `CyclicDependencyError` if not.
- `TopoSort.sort(graph)`: Returns a topologically ordered step sequence from the validated DAG.
- `StepFactory.createStep(stepDef)`: Instantiates a StepAggregate, applies execution policies, and validates parameters.
- `policies.resolvePolicy(step)`: Resolves the execution policy and constraint configuration for a given step.
- `PlanAssembler.assemble(plan)`: Produces the final `ExecutionPlanV2` with hashes and metadata.
- `PlanAssembler.computeHash(plan)`: Deterministically computes the content hash of the assembled plan.
- `ValidationAggregate.checkPlanIntegrity()`: Runs full constraint validation across all steps and reports errors/warnings.
- `ValidationAggregate.associateErrorWithStep(stepId, error)`: Attaches a specific constraint error to the offending step.

## Key Files

- `packages/@dvt/planner/src/domain/Planner.ts` — Core plan orchestration
- `packages/@dvt/planner/src/domain/graph/GraphBuilder.ts` — Graph construction and cycle detection
- `packages/@dvt/planner/src/domain/graph/TopoSort.ts` — Topological ordering
- `packages/@dvt/planner/src/domain/PlanAssembler.ts` — Plan assembly and hashing
- `packages/@dvt/planner/src/domain/stepFactory/StepFactory.ts` — Step instantiation
- `packages/@dvt/planner/src/domain/policies.ts` — Policy resolution
- `packages/@dvt/planner/src/domain/manifest.ts` — Manifest-driven node derivation
- `packages/@dvt/planner/src/domain/types.ts` — Type definitions for aggregates
