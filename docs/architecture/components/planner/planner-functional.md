---
title: planner Functionalities
status: Draft
owner: Planning Domain
last_reviewed: 2026-03-28
---

# planner Functionalities

## Functionalities

| #   | Functionality                 | Description                                                                                                                |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Plan Creation                 | Accepts a `PlannerInputEnvelope` and builds a new plan, registering all steps and dependencies into PlanAggregate.         |
| 2   | Plan Editing                  | Allows modification of an existing plan's steps, dependencies, and parameters while re-enforcing constraints.              |
| 3   | Dependency Graph Construction | Uses GraphBuilder to build and validate the DAG of step dependencies, detecting cycles before assembly.                    |
| 4   | Topological Ordering          | Uses TopoSort to determine a valid execution order for steps that respects all declared dependencies.                      |
| 5   | Plan Compilation              | Assembles the final validated plan via PlanAssembler, including hash computation and metadata attachment.                  |
| 6   | Constraint Validation         | Delegates to the Verifier and ValidationAggregate to check all business rules, required parameters, and policy compliance. |
| 7   | Lifecycle Transition          | Transitions plans through the draft → compiled → validated states, gating each transition on passing the required checks.  |
| 8   | DSL Integration               | Accepts plans expressed in the DVT DSL, translating domain-specific syntax into the internal plan model.                   |

## Main Methods

- `Planner.createPlan(input: PlannerInputEnvelope)`: Builds a new PlanAggregate from the validated input envelope.
- `Planner.editPlan(planId, changes)`: Applies changes to an existing plan and re-validates affected constraints.
- `GraphBuilder.build(steps)`: Constructs the dependency graph from the provided step definitions and detects cycles.
- `TopoSort.sort(graph)`: Returns a topologically ordered list of steps from the dependency graph.
- `PlanAssembler.assemble(plan)`: Produces the final `ExecutionPlanV2` with computed hashes and metadata.
- `StepFactory.createStep(stepDef)`: Instantiates a StepAggregate from a step definition, applying policies.
- `policies.resolvePolicy(step)`: Resolves execution policy and constraint configuration for a given step.
- `InputEnvelopeValidator.validate(input)`: Validates the input envelope shape before plan construction begins.

## Key Files

- `packages/@dvt/planner/src/domain/Planner.ts` — Core plan orchestration
- `packages/@dvt/planner/src/domain/graph/GraphBuilder.ts` — Dependency graph construction
- `packages/@dvt/planner/src/domain/graph/TopoSort.ts` — Topological step ordering
- `packages/@dvt/planner/src/domain/PlanAssembler.ts` — Plan assembly and hash computation
- `packages/@dvt/planner/src/domain/stepFactory/StepFactory.ts` — Step creation and policy application
- `packages/@dvt/planner/src/domain/policies.ts` — Policy resolution
- `packages/@dvt/planner/src/domain/InputEnvelopeValidator.ts` — Input envelope validation
- `packages/@dvt/contracts/src/planner-input.ts` — Input schema and step type definitions
