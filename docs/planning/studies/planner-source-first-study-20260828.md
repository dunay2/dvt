# DVT+ Planner - source-first architectural study

Status: Proposed / source-first study  
Date: 2026-08-28  
Audited baseline: `main@f892b48a805690053ed922825de2c99b84524fd9`  
Repository: `dunay2/dvt`

## Executive conclusion

DVT+ already has a real, deterministic and reasonably well-bounded Planner. The current problem is not to create another Planner, but to preserve its purity while completing the boundaries around it.

The current Planner already owns generic graph validation, selection/closure, deterministic topological ordering, policy resolution, planning limits, step creation and validation, deterministic decision projection, plan assembly and plan identity. Runtime DAG interpretation is separately owned by `@dvt/plan-interpreter`, while plan admission/version/hash/config verification is separately owned by `@dvt/plan-verifier`.

The main current product gap is upstream of the Planner: VTX2 semantic cards/relations must be lowered into real executable semantic workloads before they become `GenericGraphSourceV1`. That work is already owned by #2524 and coordinated with #2594/#2595/#2597/#2599/#2634. Do not duplicate it under this programme.

One additional source-grounded contract defect is not currently owned by a dedicated issue: the public Planner input accepts `PlannerEnvironmentContext`, but `PlannerEnvelopeMapper` does not forward it into the Planner-domain input, and the internal Planner type explicitly states that `environment` is stripped before handoff. The final architecture must not accept and silently drop a declared Planner input.

## Source of truth

The audit precedence is:

1. current source on `main`;
2. tests;
3. executable contracts/configuration;
4. runtime composition and package boundaries;
5. issues/ADRs/docs as secondary context.

Baseline commit:

https://github.com/dunay2/dvt/commit/f892b48a805690053ed922825de2c99b84524fd9

The baseline already includes the VTX2 typed Substrait card pilot (#2658), so this study supersedes the earlier `da5b97...` architectural snapshot.

## Current Planner architecture

Current public/kernel anchors:

- `packages/@dvt/planner/src/index.ts`
- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/planner/src/application/PlannerEnvelopeMapper.ts`
- `packages/@dvt/planner/src/domain/Planner.ts`
- `packages/@dvt/planner/src/domain/PlanExecutionDecisionProjector.ts`
- `packages/@dvt/planner/src/domain/hashing.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`

Planner package:

https://github.com/dunay2/dvt/tree/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner

The effective pipeline is:

```text
GenericGraphSourceV1
  -> contract/input validation
  -> normalization
  -> GraphBuilder + graph validation
  -> policy resolution
  -> NodeSelector / executable closure
  -> stable topological ordering
  -> planning limits
  -> StepFactory
  -> Step Registry/config validation
  -> artifact-handoff validation
  -> PlanExecutionDecision projection
  -> PlanAssembler
  -> ExecutionPlan + executionPolicy + canonicalPlanCoreJson
```

This is already a substantial Planner kernel. Do not recreate speculative `DAGAnalyzer`, `PartialExecutionResolver`, `RetryPolicyManager` or another `PlanAssembler` when those responsibilities already exist.

## Capability inventory

| Capability | Current status | Disposition |
|---|---|---|
| Generic graph ingress | Implemented | Keep `GenericGraphSourceV1` |
| DAG/graph validation | Implemented | Keep |
| Stable topological ordering | Implemented | Keep |
| Selection + upstream/downstream closure | Implemented | Keep |
| RUN/SKIP/PARTIAL selection explanation | Implemented | Keep; not semantic reuse |
| Retry/timeout policy materialization | Implemented | Keep |
| Concurrency vocabulary | Partial end-to-end | Coordinate #2663 |
| Step config/capability validation | Implemented | Keep registry boundary |
| Planning limits | Implemented | Keep |
| Deterministic plan assembly/identity | Implemented | Keep |
| Plan verification | Implemented elsewhere | Keep `@dvt/plan-verifier` |
| Runtime DAG interpretation | Implemented elsewhere | Keep `@dvt/plan-interpreter` |
| Environment semantics | Ambiguous/no-op | New bounded task |
| Semantic workload lowering | Incomplete | Existing owner #2524 |
| Safe materialization reuse | Research/delivery | Existing owners #2152/#2486/#2509 |
| Provider-aware cost estimation | Not in Planner | Do not add provider I/O to Planner |
| Substrait optimization | Not in Planner | Correctly out of scope |

## Determinism is a strength

The Planner canonicalizes semantic plan-core JSON and hashes it through the shared `@dvt/crypto` authority. Tests prove stable identity across semantically equivalent node/dependency ordering and different timestamps, and verify that callers can recompute the plan identity from `canonicalPlanCoreJson`.

Sources:

- https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner/src/domain/hashing.ts
- https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner/test/unit/determinism.test.ts
- https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts

Decision: this programme does not redesign plan identity. Any future evidence-aware extension must preserve or explicitly version identity semantics.

## RUN/SKIP/PARTIAL is selection, not result reuse

`PlanExecutionDecisionProjector` currently explains selected root/closure, nodes outside the closure and bounded partial selection:

https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner/src/domain/PlanExecutionDecisionProjector.ts

Current `SKIP` therefore means approximately "outside the selected executable closure". It does not mean that DVT has verified that a prior materialization is semantically equivalent, authorized, retained and safe to reuse.

That separate concern is correctly represented by #2509 and the DMF/R1 programmes. Selection decisions must remain distinct from future materialization decisions such as `RUN_REQUIRED` versus `REUSE_PINNED(...)`.

Coordinating owners:

- #2152 https://github.com/dunay2/dvt/issues/2152
- #2486 https://github.com/dunay2/dvt/issues/2486
- #2509 https://github.com/dunay2/dvt/issues/2509

## Primary current gap: semantic workload lowering

VTX2 already establishes the critical invariant:

```text
Substrait relation/operator count
!= Canvas card count
!= ExecutionPlan step count
```

The target chain is:

```text
Canvas / SQL / future frontend
  -> pinned Substrait profile + DVT identity sidecar
  -> provider renderer + provider-native readiness
  -> semantic workload lowering
  -> GenericGraphSourceV1
  -> @dvt/planner
  -> ExecutionPlan
```

The Planner must not understand Join/Aggregate/Filter/Window, SQL formatting, Canvas presentation or Substrait protobuf structure.

Existing owner:

- #2524 https://github.com/dunay2/dvt/issues/2524

Coordinating VTX2 issues:

- #2594 https://github.com/dunay2/dvt/issues/2594
- #2595 https://github.com/dunay2/dvt/issues/2595
- #2597 https://github.com/dunay2/dvt/issues/2597
- #2599 https://github.com/dunay2/dvt/issues/2599
- #2634 https://github.com/dunay2/dvt/issues/2634

Example: a card may contain Read + multiple Join + Filter + Project + Aggregate + Window in semantic IR, while the actual provider can execute it as one PostgreSQL workload. The executable graph should therefore contain the minimum real runtime responsibility, not one fake step per relation operator/source/card.

## New source-grounded gap: PlannerEnvironmentContext

The public contract declares `PlannerEnvironmentContext` and `PlannerInputEnvelopeV1.environment`:

https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts

But `PlannerEnvelopeMapper.toDomainBaseInput()` does not copy `environment`:

https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner/src/application/PlannerEnvelopeMapper.ts

The internal Planner input explicitly documents that environment is absent/stripped before handoff:

https://github.com/dunay2/dvt/blob/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/planner/src/domain/types.ts

#2675 mentions environment in the planner-backed StartRun variant but does not resolve this accept-and-drop behavior:

https://github.com/dunay2/dvt/issues/2675

Required decision:

- preferred if no real Planner semantic consumer exists: resolve environment upstream, remove the no-op Planner field, and pass only resolved graph/policy/step configuration to Planner;
- alternative only if current source proves Planner ownership: define a strict deterministic environment contract and make it explicitly affect planning semantics/identity as required.

Forbidden final state: a public Planner field that parses successfully and is silently ignored.

## Concurrency boundary

#2663 correctly identifies that semantic plan/run concurrency and Temporal worker capacity are different responsibilities:

https://github.com/dunay2/dvt/issues/2663

Keep:

```text
semantic execution concurrency = per-plan execution semantics
operational worker capacity     = worker/task-queue slots/pollers/lifecycle config
```

A per-plan value must never mutate shared worker capacity for unrelated runs.

## Cost/impact evidence: future input, not Planner I/O

A provider-realistic cost estimate requires mutable external facts (provider capabilities, statistics, physical-plan evidence, materialization state, possibly pricing). The Planner must not open PostgreSQL/Snowflake/etc. to obtain these facts.

Preferred future pattern:

```text
provider/statistics/materialization resolvers
  -> immutable Cost/Impact Evidence Bundle
  -> pure Planner decision
```

This is the same purity pattern already selected for materialization reuse: mutable facts are resolved outside the Planner; verified immutable evidence enters planning.

## Package boundaries to preserve

`@dvt/plan-interpreter` owns adapter-agnostic runtime DAG validation/layering:

https://github.com/dunay2/dvt/tree/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/plan-interpreter

`@dvt/plan-verifier` owns plan admission/version/hash/config verification:

https://github.com/dunay2/dvt/tree/f892b48a805690053ed922825de2c99b84524fd9/packages/%40dvt/plan-verifier

Do not absorb/reimplement either concern inside Planner merely to simplify the diagram.

## Residual package debt

The Planner still has compatibility exposure around the older compiled-code/artifact path. Existing owners #2661/#2669 are already determining whether that path is active and whether it should be retired:

- #2661 https://github.com/dunay2/dvt/issues/2661
- #2669 https://github.com/dunay2/dvt/issues/2669

If no real production consumer survives, remove Planner compatibility re-exports rather than preserve them behind aliases.

## Proposed programme

### EPICA-PLN1 Preserve Planner purity and complete semantic-workload admission

Classification: Planner boundary hardening + VTX2 execution convergence. It coordinates existing work and adds only the missing environment-contract correction. It is not a Planner rewrite or optimizer programme.

Target:

```text
semantic authoring
  -> governed provider-ready semantic workloads
  -> one truthful GenericGraphSourceV1
  -> deterministic pure Planner
  -> immutable ExecutionPlan
  -> existing verifier/interpreter/runtime
```

Existing issues coordinated, not duplicated:

- #2524 semantic workload lowering / rigid topology retirement;
- #2594/#2595/#2597/#2599/#2634 VTX2 semantic core/render/roundtrip/composition;
- #2663 semantic concurrency vs worker capacity;
- #2509/#2152/#2486 evidence-based reuse;
- #2661/#2669 artifact compatibility reduction;
- #2675 StartRun type hardening.

Only new child proposed by this study: `PLN1.1` for environment-contract truth.

## Epic Definition of Ready

- [ ] exact current main is refreshed at each implementation cut;
- [ ] #2524 remains the sole owner of semantic-workload lowering;
- [ ] #2595/#2597 are stable enough for #2524 lowering;
- [ ] all Planner `environment` producers/consumers are inventoried before contract change;
- [ ] #2675 overlap is refreshed;
- [ ] #2663 owns semantic concurrency vs worker capacity;
- [ ] R1/DMF evidence gates remain unchanged and current `SKIP` is not overloaded with reuse semantics;
- [ ] artifact compatibility delegates to #2661/#2669;
- [ ] no second Planner, graph IR, optimizer, scheduler, cost service, environment service or compatibility facade is required.

## Epic Definition of Done

- [ ] supported VTX2 cards lower through one governed semantic-workload path into `GenericGraphSourceV1`;
- [ ] new VTX2 admission is no longer governed by rigid source -> SQL transform -> sink topology;
- [ ] visual/source/IR operators do not become fake ExecutionPlan steps;
- [ ] Planner remains unaware of Substrait operator taxonomy and provider formatting;
- [ ] `PlannerEnvironmentContext` is explicitly consumed or removed; no public Planner input is silently dropped;
- [ ] semantic concurrency and Temporal worker capacity have separate truthful owners;
- [ ] RUN/SKIP/PARTIAL remains selection semantics;
- [ ] future reuse enters through #2509/#2486 evidence, never mutable provider reads from Planner;
- [ ] legacy artifact/compiled-code exposure follows #2661/#2669 disposition;
- [ ] verifier/interpreter responsibilities remain single-owned;
- [ ] Planner determinism/golden vectors stay green;
- [ ] focused contract/planner/API/VTX2/adapter/service-backed proofs and `pnpm verify:prepush` pass;
- [ ] no second Planner, optimizer, scheduler, cost DB, environment subsystem or compatibility wrapper is introduced.

## New task: PLN1.1

### TASK-PLN1.1 Reconcile PlannerEnvironmentContext and remove silent no-op planner input

Problem: public Planner input accepts `environment`; the mapper does not forward it; internal types say it is stripped. The contract therefore advertises an input that the Planner does not currently own.

Required audit:

```text
PlannerEnvironmentContext
PlannerInputEnvelopeV1.environment
StartRunCommand.environment
PlannerEnvelopeMapper
internal PlannerInputEnvelopeV1
```

Classify each use as real Planner semantic input, upstream application/workload-resolution input, compatibility-only, or test/docs-only.

Preferred solution if no Planner consumer is found:

```text
project/environment state
  -> application/workload resolver
  -> resolved graph/step config/policy
  -> Planner
```

Then remove the Planner no-op field and coordinate only the necessary StartRun shape change with #2675. Do not create an `EnvironmentResolver` subsystem merely to preserve an unused field.

Alternative only if current code proves Planner ownership: freeze a strict deterministic environment contract with explicit validation, identity impact, no secret values and golden mutation tests.

PLN1.1 Definition of Ready:

- [ ] exact main refreshed;
- [ ] repository-wide producers/consumers inventoried;
- [ ] #2675 PR/issue overlap refreshed;
- [ ] values classified for secrets and determinism;
- [ ] ownership decision made before implementation;
- [ ] compatibility posture explicitly assessed;
- [ ] no new environment subsystem required.

PLN1.1 Definition of Done:

- [ ] no public Planner field is silently discarded;
- [ ] one owner exists for environment resolution;
- [ ] Planner purity remains intact;
- [ ] secrets/arbitrary environment-variable bags do not enter Plan identity/evidence;
- [ ] contracts/facade/mapper/API constructors/tests agree on the surviving shape;
- [ ] determinism tests prove the selected semantics;
- [ ] current docs/architecture checks and `pnpm verify:prepush` pass;
- [ ] no deprecated alias, wrapper, second DTO or fake resolver remains.

Non-goals: generic config service, secrets manager, provider discovery, worker config, SQL/dbt templating redesign, planner cost estimator, unrelated Plan-identity redesign.

## Delivery order

```text
PLN1.1 environment contract truth       (independent small cut)

#2595/#2597 semantic boundary
        -> #2524 semantic workload lowering
        -> #2599 VTX2 roundtrip/live proof

#2663 concurrency boundary              (parallel bounded hardening)
#2661/#2669 artifact compatibility      (parallel reduction)
#2509/R1/DMF                            (research-gated future evolution)
```

## Explicit non-goals

Do not create `PlannerV2`, `SubstraitPlanner`, one execution step per relational operator, a provider-I/O `CostEstimator`, an environment subsystem to justify a no-op field, another DAG interpreter/verifier, another Flow IR, another scheduler, provider-specific SQL/materialization logic in Planner, another artifact store, or compatibility aliases around retired inputs.

## Success criterion

Authoring semantics can be rich while Planner inputs remain simple and truthful. `ExecutionPlan` contains only real runtime responsibilities. Mutable provider facts are resolved before planning. Runtime executes the immutable result without replanning. The target is more capability with fewer planning mechanisms, not a larger Planner.
