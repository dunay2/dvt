---
title: S08 - Planned safe partial dbt execution with pinned materializations
status: Research-gated GO through existing #2156-#2159 authorities
owner: Planner / dbt / Engine / Research
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
parent_epic: 2486
tasks: [2509]
existing_owners: [2156, 2157, 2158, 2159]
---

# S08 — Planned safe partial dbt execution with pinned materializations

## Decision

**Research-gated GO.** Integrate verified materialization reuse into the existing immutable `ExecutionPlan` only through #2156–#2159. Do not create a second partial-execution epic, planner, graph model or runtime re-planning path.

This slice intentionally has one new integration task, [#2509](https://github.com/dunay2/dvt/issues/2509), because the semantic, oracle, evidence and bounded-dbt work already has explicit owners:

- #2156 — observable semantics, effects and invalidation;
- #2157 — independent oracle and adversarial corpus;
- #2158 — machine-verifiable evidence frozen into a plan;
- #2159 — bounded safe partial dbt execution.

Creating parallel DMF tasks for those responsibilities would be duplication, not decomposition.

## Need

Opportunistic action-result reuse can save work at runtime, but it does not make a partial plan reproducible. Plan Preview and `StartRun(PlanRef)` require a stronger rule:

> If the plan says a step is satisfied by a prior materialization, the exact result, verification evidence and retention reference must be fixed before that immutable plan becomes startable.

Otherwise the runtime could observe different mutable index/S3/provider state and silently change which nodes execute.

## Current source audit

Baseline: [`main@af2a7f85ea5a2cfb5a5e9a888f702c078814b426`](https://github.com/dunay2/dvt/tree/af2a7f85ea5a2cfb5a5e9a888f702c078814b426).

`packages/@dvt/contracts/src/contracts/planner/PlanExecutionDecision.v1.ts` currently models graph-selection closure using `RUN`, `SKIP` and `PARTIAL`. These decisions answer which selected/dependency nodes belong to the plan. They do not prove a prior output is reusable.

The current planner and ADR-0042 deliberately preserve a deterministic `PlanCore`, stable `planId` and timestamps outside identity. `StartRun(PlanRef)` is the execution authority. Those invariants are exactly what this slice must preserve.

The repository does not currently contain:

- an immutable materialization candidate bundle;
- a separate per-step `RUN_REQUIRED` versus `REUSE_PINNED` decision;
- result-manifest/evidence/pin references in a stored plan;
- runtime handling that satisfies outputs from a pinned result without treating the step as skipped.

## Architectural fit

All mutable reads occur before the pure planner:

```text
current exact snapshots
+ scoped materialization-index candidates
+ independent verifier verdicts
+ retention pin receipts
+ policy/profile versions
  -> MaterializationCandidateBundleV1
  -> pure planner
  -> immutable ExecutionPlan/PlanRef
  -> Temporal executes exactly that stored plan
```

Selection and materialization remain separate axes:

```text
selection: RUN | SKIP | PARTIAL
materialization: RUN_REQUIRED(reason) | REUSE_PINNED(exact refs)
```

A `REUSE_PINNED` decision references the exact `InvocationDigest`, `ResultManifest`, evidence and active pin. It is not a boolean “cached” hint.

## Planned versus opportunistic semantics

### Planned pinned reuse

- resolved, authorized, verified and pinned before plan persistence;
- affects canonical stored plan truth;
- runtime must use that exact result;
- if the pinned result is unavailable or invalid, the exact plan fails with a typed reason;
- runtime does not silently execute the node or select another candidate.

### Opportunistic reuse of `RUN_REQUIRED`

- may consult S04 at execution time;
- is an optimization only;
- if unavailable, normal execution continues;
- does not mutate the stored materialization decision.

This distinction preserves reproducibility while still allowing concurrent action-cache savings.

## Open-source convergence

### Reuse concepts

- [dbt state selection](https://docs.getdbt.com/reference/node-selection/methods) and [defer](https://docs.getdbt.com/reference/node-selection/defer) for prior project state and upstream relation resolution;
- Bazel action/result references for exact content-bound outputs;
- existing DVT immutable plan/PlanRef and Temporal orchestration;
- S01–S04 identity, manifest, verifier and pin infrastructure.

### Important limitation

A dbt manifest/state match does not prove that warehouse data, a materialized relation or its runtime environment is unchanged. Safe reuse requires provider-specific exact snapshots/receipts and #2156 effect semantics.

### Rejected approaches

- planner reads PostgreSQL/S3/warehouse directly;
- runtime silently re-plans a stored `PlanRef`;
- overloading `SKIP` to mean reuse;
- using node names, relation names, row counts or modification timestamps as exact evidence;
- generic support for incremental models, hooks, effects and opaque macros in the first bounded profile.

## Complexity

| Dimension | Complexity | Main risk |
|---|---:|---|
| Semantic safety | Very high | Observable side effects and hidden mutable relation state. |
| Plan contract evolution | High | Preserve deterministic identity and historical compatibility. |
| Candidate resolution | High | Authorization, verification and all-or-nothing pins. |
| Runtime integration | High | Output satisfaction, events and exact-plan failure semantics. |
| Oracle | Very high | Full and partial/reused executions must be observationally equal. |
| Product explanation | High | Selection skip and reuse must never be conflated. |

## What exists and what is missing

| Capability | Exists | Missing |
|---|---|---|
| Pure deterministic planner | Yes | Immutable materialization candidate input. |
| Selection closure decisions | RUN/SKIP/PARTIAL | Separate run/reuse disposition. |
| Plan Store / PlanRef | Yes | Exact manifest/evidence/pin refs. |
| Temporal execution | Yes | Reused-success output satisfaction. |
| Research rails | #2156–#2159 | Integration into current contracts/runtime. |
| UI authority | #2161 | Projection of planned reuse and reasons. |

## Task decomposition and dependency ownership

New integration task:

- [#2509](https://github.com/dunay2/dvt/issues/2509) — candidate bundle, planner integration, pinned exact result and runtime semantics.

Existing required tasks remain authoritative and are not duplicated:

- [#2156](https://github.com/dunay2/dvt/issues/2156)
- [#2157](https://github.com/dunay2/dvt/issues/2157)
- [#2158](https://github.com/dunay2/dvt/issues/2158)
- [#2159](https://github.com/dunay2/dvt/issues/2159)
- [#2161](https://github.com/dunay2/dvt/issues/2161)

## Implementation sequence

```text
#2156 freeze bounded dbt semantics/effects
  -> #2157 oracle and deliberately unsafe corpus
  -> #2158 plan evidence contract
  -> S01-S04 exact result infrastructure
  -> resolve/verify/pin candidate bundle
  -> pure planner materialization decisions
  -> stored PlanRef runtime handling
  -> #2159 bounded end-to-end dbt vertical
  -> #2161 explanation experiment
```

Plan identity tests must show that equivalent candidate ordering produces the same plan and any changed result/evidence/policy reference changes the planned materialization identity as designed.

## Verification

Required corpus:

- exact unchanged source/runtime/input/output materialization;
- changed code, macro, dependency, input snapshot or target semantics;
- missing/corrupt/expired/quarantined result;
- effectful hooks, opaque macros and incremental models rejected or executed;
- candidate order variation;
- pin failure before persistence;
- pin/result loss after persistence;
- plan replay and Temporal recovery;
- full versus partial/reused normalized observations.

Release gates inherited from #2152/#2157/#2159:

```text
false-safe planned reuse = 0
full-vs-partial observable divergence = 0
reuse without structured evidence/pin = 0
runtime replanning of stored PlanRef = 0
opaque/effectful case silently reused = 0
```

## Stop and narrow conditions

Stop or narrow when:

- an exact external input/output snapshot cannot be established;
- effect semantics remain ambiguous;
- plan contract evolution would introduce mutable runtime choice;
- a pinned provider snapshot cannot be retained through execution;
- the oracle cannot detect deliberately unsafe reuse;
- performance value fails #2152 thresholds.

The correct fallback is full execution of the current exact plan, not a weaker reuse proof.

## Gate result

```text
gateDecision: research-gated-go
gateScope: bounded-dbt-profile-only
authorizedImplementation: false
blocksOn:
  - #2156
  - #2157
  - #2158
  - S01-S04
  - #2159 bounded profile
newTasksCreated: 1
reasonForSingleTask: existing authorities already own semantics, oracle, evidence and vertical proof
```
