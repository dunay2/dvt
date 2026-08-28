# DVT+ Planner - Source-First Architectural Study and Delivery Plan

**Status:** Proposed / source-first study  
**Date:** 2026-08-28  
**Repository:** `dunay2/dvt`  
**Audited baseline:** `main@f892b48a805690053ed922825de2c99b84524fd9`  
**Scope:** Planner kernel, planner ingress/egress boundaries, semantic workload lowering, runtime policy boundary, planning evidence and residual package debt.

## 1. Executive summary

DVT+ already has a real, deterministic and reasonably well-bounded Planner. The current architectural problem is not to create a Planner, but to preserve its purity while completing the boundaries around it.

The Planner currently owns generic graph validation, selection and closure, deterministic topological ordering, policy resolution, limits, step construction/validation, deterministic decision projection, Plan assembly and plan identity. Runtime DAG interpretation and plan admission verification are already separated into `@dvt/plan-interpreter` and `@dvt/plan-verifier` respectively.

The main product gap is upstream of the Planner: VTX2 semantic relations/cards must be lowered into real executable semantic workloads before they become `GenericGraphSourceV1`. This is already owned by #2524 and coordinated with #2594/#2595/#2597/#2634. DVT must not create a second planner, a Substrait-aware planner, one execution step per relational operator, or a cost/provider introspector inside the Planner.

One additional source-grounded contract defect is not currently owned by an issue: the public Planner input accepts `PlannerEnvironmentContext`, while `PlannerEnvelopeMapper` does not copy it into the internal Planner input and the internal type explicitly states that `environment` is stripped before handoff. This is a truthful-contract problem: either environment resolution belongs upstream and the Planner contract must stop advertising the field, or the field has planner semantics and must be consumed explicitly. Silent acceptance-and-drop is not an acceptable final state.

## 2. Source of truth and audit method

This study uses the following precedence:

1. current source on `main`;
2. current tests;
3. executable contracts and configuration;
4. runtime composition and package boundaries;
5. open issues only after checking source ownership.

The audited main baseline is:

- https://github.com/dunay2/dvt/commit/f892b48a805690053ed922825de2c99b84524fd9

The baseline commit includes the VTX2 typed Substrait card pilot (#2658), so this study reflects the first integrated VTX2 semantic-authoring increment rather than the previous `da5b97...` state.

## 3. Current Planner architecture

### 3.1 Public boundary

The Planner public surface is intentionally narrow and is exposed through `PlannerFacade` rather than direct use of the domain `Planner`.

Relevant source:

- `packages/@dvt/planner/src/index.ts`
- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/planner/src/domain/Planner.ts`

Repository link:

- https://github.com/dunay2/dvt/tree/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner

### 3.2 Current planning pipeline

The implemented planning pipeline is conceptually:

```text
GenericGraphSourceV1
        |
        v
contract/input validation
        |
        v
normalization
        |
        v
GraphBuilder + graph validation
        |
        v
policy resolution
        |
        v
NodeSelector / executable closure
        |
        v
stable topological ordering
        |
        v
planning limits
        |
        v
StepFactory
        |
        v
Step Registry + step config validation
        |
        v
artifact-handoff validation
        |
        v
PlanExecutionDecision projection
        |
        v
PlanAssembler
        |
        v
ExecutionPlan + executionPolicy + canonicalPlanCoreJson
```

This is already a substantial Planner kernel. The old conceptual decomposition into separate speculative services such as `DAGAnalyzer`, `PartialExecutionResolver`, `RetryPolicyManager` and `PlanAssembler` must not be recreated as new subsystems when equivalent responsibilities already exist.

## 4. Current capability inventory

| Capability                                     | Status                      | Source-grounded disposition                                               |
| ---------------------------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| Generic graph ingress                          | Implemented                 | Keep `GenericGraphSourceV1` as the planner ingress                        |
| Graph/DAG validation                           | Implemented                 | Keep current graph validation; runtime interpretation remains separate    |
| Stable topological ordering                    | Implemented                 | Keep deterministic ordering                                               |
| Root selection and upstream/downstream closure | Implemented                 | Keep                                                                      |
| RUN/SKIP/PARTIAL selection explanation         | Implemented                 | Keep; do not confuse with semantic result reuse                           |
| Retry policy materialization                   | Implemented                 | Keep                                                                      |
| Timeout policy materialization                 | Implemented                 | Keep                                                                      |
| Concurrency vocabulary                         | Partially integrated        | Separate semantic run concurrency from Temporal worker capacity (#2663)   |
| Step-kind/config validation                    | Implemented                 | Keep registry boundary                                                    |
| Planning limits                                | Implemented                 | Keep                                                                      |
| Deterministic Plan assembly                    | Implemented                 | Keep                                                                      |
| RFC 8785/JCS + SHA-256 plan identity           | Implemented                 | Keep; shared primitive authority is `@dvt/crypto`                         |
| Cross-runtime determinism proof                | Implemented                 | Keep regression proof                                                     |
| Plan admission verification                    | Implemented elsewhere       | Keep in `@dvt/plan-verifier`                                              |
| Runtime DAG layers/interpretation              | Implemented elsewhere       | Keep in `@dvt/plan-interpreter`                                           |
| Planner environment semantics                  | Ambiguous/no-op             | New bounded task required                                                 |
| Semantic workload lowering                     | Incomplete                  | Existing owner #2524; do not duplicate                                    |
| Safe semantic materialization reuse            | Research/delivery programme | Existing owners #2152/#2509/DMF                                           |
| Provider-aware cost estimation                 | Not in Planner              | Do not add provider I/O to Planner; consume evidence only if/when defined |
| Substrait relational optimization              | Not in Planner              | Correctly out of scope                                                    |

## 5. Determinism and identity - current strength

Current Planner determinism is one of the strongest areas of the implementation.

The Planner canonicalizes its semantic plan core and hashes it using the shared crypto authority. Volatile metadata such as `createdAtIso` is deliberately outside plan identity. Tests prove that semantically equivalent node/dependency ordering yields the same plan identity, that differing timestamps do not affect identity, and that the canonical plan core can be independently hashed by callers.

Relevant sources:

- `packages/@dvt/planner/src/domain/hashing.ts`
- `packages/@dvt/planner/test/unit/determinism.test.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`

Links:

- https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner/src/domain/hashing.ts
- https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner/test/unit/determinism.test.ts
- https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts

**Decision:** do not redesign the plan identity model as part of this epic. Any future evidence-aware planning extension must preserve or explicitly version identity semantics.

## 6. RUN/SKIP/PARTIAL is selection, not semantic reuse

`PlanExecutionDecisionProjector` currently explains selection and closure. Its decisions express selected roots, selected closure, nodes outside the selected closure and bounded partial selection.

Relevant source:

- https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner/src/domain/PlanExecutionDecisionProjector.ts

This means current `SKIP` is approximately:

```text
node is outside the selected executable closure
```

It does **not** mean:

```text
DVT proved that an existing prior output is semantically equivalent,
verified, authorized, retained and safe to reuse.
```

That distinction is already correctly represented in the Materialization Fabric direction. #2509 proposes a separate materialization decision such as `RUN_REQUIRED` versus `REUSE_PINNED(...)` while preserving selection decisions.

Existing owners:

- #2152 - https://github.com/dunay2/dvt/issues/2152
- #2486 - https://github.com/dunay2/dvt/issues/2486
- #2509 - https://github.com/dunay2/dvt/issues/2509

**Decision:** the new epic coordinates these programmes but does not duplicate or accelerate them around their scientific/evidence gates.

## 7. Primary current gap: semantic workload lowering

VTX2 deliberately separates three counts:

```text
Substrait relation/operator count
!= Canvas card count
!= ExecutionPlan step count
```

This invariant is already stated in `ExecutionPlan.v1.ts`: logical transformation semantics stay outside `ExecutionPlan`, and plan steps represent runtime responsibilities only.

The correct path is:

```text
Canvas / SQL / future DataFrame frontend
        |
        v
pinned Substrait logical profile + DVT identity sidecar
        |
        v
provider renderer + provider-native readiness
        |
        v
semantic workload lowering
        |
        v
GenericGraphSourceV1
        |
        v
@dvt/planner
        |
        v
ExecutionPlan
```

The Planner must not understand `Join`, `Aggregate`, `Filter`, `Window`, SQL formatting, Canvas card presentation or Substrait protobuf structure.

The existing owner is #2524:

- https://github.com/dunay2/dvt/issues/2524

Coordinating VTX2 issues include:

- #2594 - https://github.com/dunay2/dvt/issues/2594
- #2595 - https://github.com/dunay2/dvt/issues/2595
- #2597 - https://github.com/dunay2/dvt/issues/2597
- #2599 - https://github.com/dunay2/dvt/issues/2599
- #2634 - https://github.com/dunay2/dvt/issues/2634

### Example target lowering

A semantic card may internally contain:

```text
Read(orders)
Join(customers)
Join(countries)
Filter(status = paid)
Project(...)
Aggregate(...)
Window(...)
```

but if the provider can execute the whole transformation as one real query/workload, the resulting executable graph should be equivalent to:

```text
step: postgres_relational_workload
  artifactRef: immutable governed SQL/code artifact
  dependencies: only real execution dependencies
  materialization intent: adapter-owned where applicable
```

It must not become one runtime step per relational operator or one fake Source/Join/Capture step merely because those concepts exist in the UI or semantic IR.

## 8. New source-grounded defect: PlannerEnvironmentContext is accepted and dropped

The public contract currently includes:

```ts
export interface PlannerEnvironmentContext {
  environmentId?: string;
  vars?: Record<string, unknown>;
}
```

and `PlannerInputEnvelopeV1` contains:

```ts
environment?: PlannerEnvironmentContext;
```

Source:

- https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts

However, `PlannerEnvelopeMapper.toDomainBaseInput()` does not copy `environment` into the internal input:

- https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner/src/application/PlannerEnvelopeMapper.ts

The internal Planner input explicitly says that `environment` is absent and stripped before handoff:

- https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner/src/domain/types.ts

An open-issue search found #2675, which models `environment` as legal only in the planner-backed Start Run variant, but it does not resolve the Planner's accept-and-drop behavior:

- #2675 - https://github.com/dunay2/dvt/issues/2675

### Required decision

Choose exactly one outcome from current source evidence:

**A. Upstream-owned environment resolution (preferred unless a real Planner consumer is demonstrated)**

```text
project/environment config
    -> application/workload resolution
    -> fully resolved GenericGraphSource / policies
    -> Planner
```

Then remove `environment` from the public Planner contract and any no-op Start Run planner input that cannot affect planning semantics.

**B. Planner-owned environment semantics**

Keep `environment` only if a current, explicit Planner decision depends on it. In that case define its exact deterministic semantics, canonical identity posture, validation and tests and make the mapper consume it.

**Forbidden final state:** accept a field at the public contract and silently discard it.

## 9. Concurrency boundary

The Planner can materialize concurrency intent into step configuration, but Temporal worker concurrency/capacity is a process/task-queue operational concern.

Existing owner:

- #2663 - https://github.com/dunay2/dvt/issues/2663

The architectural distinction must remain:

```text
semantic execution concurrency
  = what one plan/run is allowed to execute in parallel

operational worker capacity
  = slots/pollers/concurrency available to a Temporal worker lifecycle
```

A per-plan policy must never mutate shared worker capacity for unrelated runs.

## 10. Cost and impact evidence - future opportunity, not a Planner service

The current Planner has no provider-aware cost estimator. This should not be treated as a missing class to create inside `@dvt/planner`.

A provider-realistic estimate requires external facts such as provider capabilities, data statistics, physical plan information, materialization state and possibly current pricing. Those are mutable provider facts and would destroy Planner purity if fetched directly.

Preferred future architecture:

```text
provider/statistics/materialization evidence resolvers
                    |
                    v
immutable Cost/Impact Evidence Bundle
                    |
                    v
pure Planner policy decision
```

The same pattern applies to materialization reuse: mutable reads happen outside the Planner; only immutable verified evidence enters planning.

## 11. Package boundaries that must remain separate

### `@dvt/plan-interpreter`

Owns adapter-agnostic runtime DAG interpretation and layering. It must not be reimplemented inside the Planner.

- https://github.com/dunay2/dvt/tree/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/plan-interpreter

### `@dvt/plan-verifier`

Owns plan admission/version/hash/step-type verification. It must not be absorbed into the Planner merely to reduce package count.

- https://github.com/dunay2/dvt/tree/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/plan-verifier

## 12. Residual Planner package debt

The Planner public surface still contains compatibility exposure around compiled-code/artifact storage. Current artifact hardening work is already investigating whether this legacy path is active.

Existing owners:

- #2661 - https://github.com/dunay2/dvt/issues/2661
- #2669 - https://github.com/dunay2/dvt/issues/2669

If the legacy compiled-code path has no real current production consumer, the correct action is to retire it and remove Planner compatibility re-exports rather than preserve them behind a facade.

## 13. Proposed epic

### Title

**EPICA-PLN1 Preserve Planner purity and complete semantic-workload admission**

### Classification

Planner boundary hardening + VTX2 execution convergence. This epic coordinates existing work and adds only the missing environment-contract correction. It is **not** a Planner rewrite and **not** a new optimization framework.

### Objective

Finish the current Planner architecture so that:

```text
semantic authoring
  -> governed provider-ready semantic workloads
  -> one truthful GenericGraphSourceV1
  -> deterministic pure Planner
  -> immutable ExecutionPlan
  -> existing verifier/interpreter/runtime
```

without duplicating the relational IR, provider logic, runtime scheduler, state store, cost engine or materialization programmes.

### Existing issues coordinated, not duplicated

- #2524 - semantic workload lowering and retirement of rigid SQL-first topology
- #2594/#2595/#2597/#2599/#2634 - VTX2 semantic core, renderer, roundtrip and composition
- #2663 - semantic concurrency versus Temporal worker capacity
- #2509/#2152/#2486 - evidence-based materialization reuse and safe partial execution
- #2661/#2669 - legacy compiled-code/artifact compatibility reduction
- #2675 - StartRun planner-backed command type safety

### New child required

- `PLN1.1` - reconcile `PlannerEnvironmentContext`; eliminate silent public accept-and-drop behavior.

No other new implementation issue should be created until an existing-owner check proves a non-overlapping gap.

## 14. Epic Definition of Ready

The epic is Ready when:

- [ ] exact `main` SHA is recorded at implementation start and every child refreshes it;
- [ ] #2524 remains the sole owner of semantic-workload lowering;
- [ ] #2595/#2597 semantic profile/render boundary is sufficiently stable for #2524 lowering work;
- [ ] all current `PlannerInputEnvelopeV1` producers and consumers are inventoried before changing `environment`;
- [ ] #2675 overlap is refreshed and the environment change does not duplicate StartRun exclusivity work;
- [ ] semantic run concurrency and operational Temporal capacity are explicitly separated under #2663;
- [ ] existing materialization-reuse/R1 gates remain unchanged and no reuse shortcut is introduced into current `SKIP` semantics;
- [ ] artifact compatibility work delegates to #2661/#2669 rather than creating Planner-local storage abstractions;
- [ ] no new Planner, graph IR, optimizer, provider registry, scheduler, environment service, cost service or compatibility facade is required.

## 15. Epic Definition of Done

The epic is Done when:

- [ ] supported VTX2 semantic cards lower through one governed semantic-workload path into `GenericGraphSourceV1`;
- [ ] current product admission no longer requires the rigid source -> SQL transform -> sink topology for new VTX2 plans;
- [ ] no relational IR operator, consumed source card or visual-only node becomes a fake ExecutionPlan step;
- [ ] Planner remains unaware of Substrait relational operator taxonomy and SQL/provider formatting;
- [ ] `PlannerEnvironmentContext` has one explicit disposition: consumed with deterministic semantics or removed from the Planner contract; no accepted Planner input is silently dropped;
- [ ] semantic concurrency and Temporal worker capacity are separately owned and executable/truthful;
- [ ] current RUN/SKIP/PARTIAL semantics remain selection semantics and are not silently reused as materialization-cache semantics;
- [ ] any future reuse decision enters through the evidence contracts owned by #2509/#2486 rather than mutable provider reads from Planner;
- [ ] legacy compiled-code compatibility exposure is removed or retained only with evidenced production ownership from #2661/#2669;
- [ ] `@dvt/plan-verifier` and `@dvt/plan-interpreter` remain the sole existing owners of their current responsibilities;
- [ ] Planner determinism/golden vectors remain green and semantically equivalent inputs retain stable identities unless an explicit versioned contract change is accepted;
- [ ] focused contracts/planner/API/VTX2/adapter tests and relevant service-backed proofs pass;
- [ ] `pnpm verify:prepush` passes on exact final heads;
- [ ] no second Planner, graph model, optimizer, scheduler, cost database, environment resolver subsystem or compatibility wrapper has been introduced.

## 16. New task specification - PLN1.1

### Title

**TASK-PLN1.1 Reconcile PlannerEnvironmentContext and remove silent no-op planner input**

### Problem

The public Planner input accepts an `environment` field but the Planner mapper does not forward it and internal Planner types state that the value has been stripped. This creates a contract that advertises behavior which the Planner does not currently own.

### Scope

Inventory every current producer/consumer of:

```text
PlannerEnvironmentContext
PlannerInputEnvelopeV1.environment
StartRunCommand.environment
PlannerEnvelopeMapper
internal PlannerInputEnvelopeV1
```

Classify every use as:

```text
real planner semantic input
application/workload-resolution input
compatibility-only input
test-only/documentation-only
```

### Preferred solution

If no real Planner decision consumes environment values, move/keep environment resolution upstream and hard-cut the public Planner field:

```text
project/environment state
    -> application/workload resolver
    -> resolved graph/step config/policy
    -> Planner
```

Update #2675's planner-backed Start Run shape only as required so the HTTP/application boundary no longer forwards a Planner no-op. Do not add a new environment service merely to preserve the field.

### Alternative solution

If current source proves the Planner must resolve an environment-dependent planning choice, define the smallest deterministic contract:

- exact allowed fields;
- validation;
- canonical identity inclusion/exclusion;
- policy interaction;
- no secret values;
- deterministic tests proving which mutations change Plan identity/steps.

### Example acceptance proof

Before:

```text
request.environment = { vars: { concurrency: 7 } }
            |
            v
Planner contract accepts
            |
            v
PlannerEnvelopeMapper drops
            |
            v
same Plan as if field were absent
```

After preferred hard cut:

```text
request/environment config
            |
            v
application resolves allowed semantic value
            |
            v
resolved policy/step config
            |
            v
Planner receives only planning truth
```

or, if the field is proven Planner-owned:

```text
request.environment
            |
            v
strict deterministic Planner environment mapping
            |
            v
explicit plan/policy mutation
            |
            v
golden determinism proof
```

### Definition of Ready

- [ ] exact current main refreshed;
- [ ] repository-wide producer/consumer search complete;
- [ ] #2675 implementation/PR overlap refreshed;
- [ ] all environment values classified for secrets and determinism;
- [ ] authority decision is made before implementation: upstream-owned or Planner-owned;
- [ ] compatibility obligation for persisted/public planner payloads is explicitly assessed;
- [ ] no new environment subsystem is required.

### Definition of Done

- [ ] no public Planner field is accepted and silently discarded;
- [ ] one owner exists for environment resolution;
- [ ] Planner purity is preserved;
- [ ] no secrets or arbitrary environment-variable bags enter Plan identity/evidence;
- [ ] valid existing planner-backed start behavior remains compatible or uses an explicitly approved pre-alpha hard cut;
- [ ] contract, facade, mapper, API constructors and tests agree on the surviving shape;
- [ ] determinism tests prove the selected semantics;
- [ ] source/docs/architecture checks and `pnpm verify:prepush` pass;
- [ ] no wrapper, deprecated alias, second DTO or fake environment resolver remains.

### Non-goals

- generic configuration service;
- secrets manager;
- provider discovery;
- runtime worker configuration;
- SQL/dbt environment templating redesign;
- planner cost estimator;
- changing unrelated Plan identity semantics.

## 17. Delivery order

Recommended order:

```text
PLN1.1 environment contract truth       (small / independent)

#2595/#2597 VTX2 semantic boundary
            |
            v
#2524 semantic workload lowering
            |
            v
#2599 VTX2 roundtrip/live proof

#2663 semantic concurrency boundary     (parallel bounded hardening)

#2661/#2669 artifact compatibility      (parallel reduction)

#2509 / R1 / DMF                        (research-gated future planner evidence)
```

The epic should not wait for the complete Materialization Fabric to close if its current Planner-boundary objectives are satisfied; evidence-aware reuse remains coordinated future evolution unless explicitly promoted into this epic by a new source-grounded product decision.

## 18. Explicit non-goals

Do not create:

- `PlannerV2` as a parallel implementation;
- `SubstraitPlanner`;
- one execution step per relational operator;
- `CostEstimator` that opens provider/database connections from Planner;
- `EnvironmentResolver` subsystem only to justify an unused input field;
- another DAG interpreter;
- another plan verifier;
- a second graph/Flow IR;
- a generic scheduler beside Temporal;
- provider-specific SQL/materialization policy in Planner;
- a second artifact store;
- compatibility aliases around retired planner inputs.

## 19. Success criterion

DVT has succeeded when the Planner remains small, deterministic and evidence-driven while surrounding layers provide exactly the information it needs:

```text
Authoring semantics are rich.
Planner inputs are simple and truthful.
ExecutionPlan contains only real runtime responsibilities.
Mutable provider facts are resolved before planning.
Runtime executes the immutable result without replanning.
```

The architectural target is therefore **more capability with fewer planning mechanisms**, not a larger Planner.
