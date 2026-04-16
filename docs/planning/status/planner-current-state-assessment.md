---
title: Planner Current State Assessment
status: Active
owner: Architecture / Planner / Docs
last_reviewed: 2026-04-10
planning_type: status
---

# Planner Current State Assessment

This document is the planner-specific source of truth for the current repository
state.

The first planner assessment was published on `2026-03-20`. This file keeps a
stable name so links do not rot. The content is intentionally limited to claims
that can be verified in the current tree.

## How To Read This Page

Use this page when the question is one of these:

- what the planner bounded context does today
- which packages and methods form the active planner path
- where planner stops and runtime ownership begins
- which gaps are still open in code, not just in proposals

Do not use this page as a roadmap, scorecard, or proposal backlog. The previous
percentage-based assessment drifted from code and has been removed.

## Verification Method

This review was refreshed on `2026-04-10` against the current code and tests in:

- `packages/@dvt/planner/**`
- `packages/@dvt/contracts/src/contracts/planner/**`
- `packages/@dvt/plan-verifier/**`
- `packages/@dvt/plan-interpreter/**`
- `packages/@dvt/dsl/**`
- `apps/api/src/application/services/**`
- `apps/api/src/infrastructure/planner/**`

## Canonical References

- [Governance Document And Rule Inventory](./governance-document-rule-inventory.md)
- [Canonical Doc Code Matrix](./canonical-doc-code-matrix.md)
- [Planner contracts](../../contracts/planner/index.md)
- [ADR-0035 - Planner public contract evolution](../../adr/ADR-0035-planner-public-contract-evolution-protocol.md)
- [ADR-0036 - ExecutionPlan planVersion registry](../../adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md)
- [Planner component docs](../../architecture/components/planner/index.md)
- [Current status](../../architecture/system-delivery-status.md)

## Current System View

```mermaid
flowchart LR
    Contracts["Planner contracts and ADRs"] --> Facade["PlannerFacade.buildPlan()"]
    Facade --> Mapper["PlannerEnvelopeMapper"]
    Facade --> Core["Planner.buildPlan()"]
    Core --> Registry["IStepTypeRegistry.validate()"]
    Core --> Assembler["PlanAssembler.execute()"]
    Assembler --> Plan["ExecutionPlan + canonicalPlanCoreJson"]
    Plan --> Verifier["verifyPlanOrThrow()"]
    Plan --> Store["Plan validation lifecycle store"]
    Store --> Admission["StoredPlanExecutabilityValidator.validatePlan()"]
    Admission --> StartRun["PlannerBackedStartRunUseCase.execute()"]
    StartRun --> Engine["Engine start-run delegate"]
```

## Current Package Map

1. `@dvt/planner`
   Current role in code: contract boundary plus deterministic plan compilation
   Primary anchors:
   [PlannerFacade.ts](../../../packages/@dvt/planner/src/application/PlannerFacade.ts),
   [Planner.ts](../../../packages/@dvt/planner/src/domain/Planner.ts),
   [PlanAssembler.ts](../../../packages/@dvt/planner/src/domain/PlanAssembler.ts)
   Primary evidence: `packages/@dvt/planner/test/unit/**`
2. `planner contracts in @dvt/contracts`
   Current role in code: public input envelope, execution plan, plan version,
   plan record, step registry
   Primary anchors:
   [ExecutionPlan.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts),
   [PlanVersion.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/PlanVersion.v1.ts),
   [PlanRecord.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.ts)
   Primary evidence: `packages/@dvt/contracts/test/**`
3. `@dvt/plan-verifier`
   Current role in code: version gate plus `planId` integrity verification
   Primary anchors:
   [verify.ts](../../../packages/@dvt/plan-verifier/src/verify.ts)
   Primary evidence:
   [verify.test.ts](../../../packages/@dvt/plan-verifier/test/verify.test.ts)
4. `@dvt/plan-interpreter`
   Current role in code: shared DAG analysis helpers used by adapters
   Primary anchors:
   [index.ts](../../../packages/@dvt/plan-interpreter/src/index.ts)
   Primary evidence: `packages/@dvt/plan-interpreter/test/**`
5. `@dvt/dsl`
   Current role in code: deterministic parser and evaluator for gateway
   expressions
   Primary anchors:
   [index.ts](../../../packages/@dvt/dsl/src/index.ts)
   Primary evidence: `packages/@dvt/dsl/test/**`
6. `apps/api` planner bridge
   Current role in code: stored-plan executability validation, planner-backed
   start-run, and explicit manifest utility outside the protected runtime
   ingress
   Primary anchors:
   [ManifestArtifactResolver.ts](../../../apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts),
   [StoredPlanExecutabilityValidator.ts](../../../apps/api/src/application/services/StoredPlanExecutabilityValidator.ts),
   [PlannerBackedStartRunUseCase.ts](../../../apps/api/src/application/services/PlannerBackedStartRunUseCase.ts),
   [startRunRoutePlanSourcePolicy.ts](../../../apps/api/src/entrypoints/http/startRunRoutePlanSourcePolicy.ts)
   Primary evidence:
   [PlannerBackedStartRunUseCase.test.ts](../../../apps/api/test/application/services/PlannerBackedStartRunUseCase.test.ts),
   [StoredPlanExecutabilityValidator.test.ts](../../../apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts),
   [plannerEngineContract.test.ts](../../../apps/api/test/integration/plannerEngineContract.test.ts),
   [startRunRoutePlanSourcePolicy.test.ts](../../../apps/api/test/entrypoints/http/startRunRoutePlanSourcePolicy.test.ts)

## Public Methods And Boundaries

1. `buildPlan(input)`
   Owner: `PlannerFacade`
   What it does today: validates the public canonical `graphSource` envelope,
   maps it into planner-domain input, and delegates to the domain planner
   Boundary note: public planner entrypoint
2. `buildPlan(input)` / `execute(command)`
   Owner: `Planner`
   What it does today: validates normalized input, builds graph, applies
   selection, validates step configs, assembles the canonical plan
   Boundary note: pure planner core
3. `execute(command)`
   Owner: `PlanAssembler`
   What it does today: hashes planner input, builds `planCore`, computes
   `planId`, emits `ExecutionPlan`, and returns `canonicalPlanCoreJson` plus
   `executionPolicy`
   Boundary note: deterministic core plus volatile metadata attachment
4. `verifyPlanOrThrow(params)`
   Owner: `@dvt/plan-verifier`
   What it does today: checks plan version compatibility and `planId` integrity
   Boundary note: verifier, not planner
5. `validatePlan(planRef, adapterId)`
   Owner: `StoredPlanExecutabilityValidator`
   What it does today: fetches the stored plan, parses it, checks ref
   alignment, step-kind support, and required adapter capabilities
   Boundary note: API admission bridge
6. `execute(command, context)`
   Owner: `PlannerBackedStartRunUseCase`
   What it does today: compiles when `planRef` is absent, stores the plan,
   validates executability, marks valid or invalid, then delegates start-run
   Boundary note: API orchestration, not planner package

## Current `buildPlan()` Flow

```mermaid
sequenceDiagram
    participant Caller as Caller
    participant Facade as PlannerFacade
    participant Mapper as PlannerEnvelopeMapper
    participant Core as Planner
    participant Validator as InputEnvelopeValidator
    participant Graph as GraphBuilder
    participant Selector as NodeSelector
    participant Registry as IStepTypeRegistry
    participant Assembler as PlanAssembler

    Caller->>Facade: buildPlan(input)
    Facade->>Mapper: toDomainBaseInput(input)
    Facade->>Core: buildPlan(domain input)
    Core->>Validator: validate(input)
    Core->>Graph: execute(command)
    Graph-->>Core: nodesById + dependentsById
    Core->>Selector: execute(selection)
    Selector-->>Core: selected nodeIds
    Core->>Registry: validate(kind, stepTypeConfig)
    Registry-->>Core: success or error
    Core->>Assembler: execute(command)
    Assembler-->>Core: plan + executionPolicy + canonicalPlanCoreJson
    Core-->>Facade: PlannerBuildResultV1
    Facade-->>Caller: PlannerBuildResultV1
```

## Runtime Handoff Today

```mermaid
flowchart LR
    Request["start-run request without planRef"] --> Policy["startRunRoutePlanSourcePolicy"]
    Policy --> UseCase["PlannerBackedStartRunUseCase"]
    UseCase --> Planner["IPlanner.buildPlan()"]
    Planner --> Store["IPlanValidationLifecycleStore.storePlan()"]
    Store --> Ref["PlanRef"]
    Ref --> Validate["StoredPlanExecutabilityValidator.validatePlan()"]
    Validate --> Decision{"OK?"}
    Decision -- no --> Invalid["markInvalid(planRef)"]
    Decision -- yes --> Valid["markValid(planRef)"]
    Valid --> Delegate["delegate.execute(command + planRef)"]
```

## Verified Current Truths

- The public planner envelope is `PlannerInputEnvelopeV1`, and the active contract requires canonical `graphSource`. Legacy `manifestRef`, raw `manifest`, and raw `nodes` are rejected at the planner boundary. See [ExecutionPlan.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts).
- `PlannerFacade` no longer depends on a graph-source resolver port or manifest cache. Source-native adaptation happens before planner admission, not inside the planner package. See [PlannerFacade.ts](../../../packages/@dvt/planner/src/application/PlannerFacade.ts).
- The domain planner consumes normalized `graphSource` only and stays IO-free once the facade handoff is complete. See [Planner.ts](../../../packages/@dvt/planner/src/domain/Planner.ts) and [types.ts](../../../packages/@dvt/planner/src/domain/types.ts).
- `PlanAssembler` does not hardcode `planVersion: '2.3'`. It emits `CURRENT_EXECUTION_PLAN_VERSION` from contracts, which is currently `1.0`. See [PlanAssembler.ts](../../../packages/@dvt/planner/src/domain/PlanAssembler.ts) and [PlanVersion.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/PlanVersion.v1.ts).
- The planner still validates known step kinds through `IStepTypeRegistry`, and unknown step kinds still fail open. This is not a hypothetical gap; it is asserted in [step-registry-integration.test.ts](../../../packages/@dvt/planner/test/unit/step-registry-integration.test.ts).
- `PlanRecord.v1` exists as a governed contract, and the API/runtime path already persists and validates stored plans through `PostgresPlanStore`, `StoredPlanExecutabilityValidator`, and `PlannerBackedStartRunUseCase`. See [PlanRecord.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.ts), [StoredPlanExecutabilityValidator.ts](../../../apps/api/src/application/services/StoredPlanExecutabilityValidator.ts), and [PlannerBackedStartRunUseCase.ts](../../../apps/api/src/application/services/PlannerBackedStartRunUseCase.ts).
- The protected runtime hard-cuts planner-backed ingress to canonical `graphSource` for both `POST /runs/start` and `POST /plans/preview`. The retained [ManifestArtifactResolver.ts](../../../apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts) is now an explicit infrastructure utility, not an active planner-backed runtime boundary.
- The shipped planner package stops at canonical plan construction. Runtime admission, stored-plan lifecycle transitions, and provider dispatch belong to API and engine surfaces, not to `@dvt/planner` itself.

## Verified Open Gaps

- The planner still fails open for unknown step kinds. If the target policy is fail closed end to end, that change has not landed yet. Evidence: [step-registry-integration.test.ts](../../../packages/@dvt/planner/test/unit/step-registry-integration.test.ts).
- `PlanAssembler` still attaches volatile metadata such as `createdAtIso` to the final `ExecutionPlan`, so the strict determinism guarantee applies to `planCore` and `canonicalPlanCoreJson`, not to the full serialized plan object. Evidence: [PlanAssembler.ts](../../../packages/@dvt/planner/src/domain/PlanAssembler.ts).
- A generic graph-source ref boundary does not exist yet. The retained [ManifestArtifactResolver.ts](../../../apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts) is explicit infrastructure only and not a canonical planner ingress seam.
- This document still depends on summary component pages under `docs/architecture/components/planner/**`. Those pages are maintained as summaries only; normative behavior continues to live in contracts, ADRs, and code.

## Historical Note

The `2026-03-20` assessment was useful as a first pass, but its percentages,
file counts, and several architecture claims drifted. This stable file now
keeps only verifiable current-state material. Historical planner proposals and
older assessment slices belong in planning history, not in the active source of
truth.
