---
title: PlanCore operational consumption design spike
status: Active
owner: Architecture / Planner / Engine / API / Contracts
last_reviewed: 2026-04-07
planning_type: review
---

# PlanCore operational consumption design spike

## Scope

This document answers a narrow design question:

- `PlanCore` already exists in
  [ExecutionPlan.v1.ts](../../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts).
- `RunExecutionPolicy` already exists as the execution-policy boundary accepted
  by [ADR-0046](../../../adr/ADR-0046-execution-plan-definition-and-run-execution-policy-separation.md).

The remaining question is not whether those concepts should be invented.

The question is whether DVT should start **consuming** the existing `PlanCore`
split operationally, instead of continuing to consume the canonical public
`ExecutionPlan` artifact directly.

This is a design spike only.

It does not authorize implementation by itself.

## Executive conclusion

The split is **not worth implementing as a public runtime-contract change right
now**.

The repository already achieved the important boundary correction in
[ADR-0046](../../../adr/ADR-0046-execution-plan-definition-and-run-execution-policy-separation.md):

- runtime policy is no longer mixed into `ExecutionPlan`
- `PlanRef` is identity/integrity only
- `RunExecutionPolicy` already exists as a separate execution-policy contract

Because of that, a further operational split of `ExecutionPlan` into
`PlanCore + execution envelope` would now buy only a small semantic gain while
creating high migration churn across:

- contracts
- engine
- adapters
- state-store fetchers
- API resolver code
- tests and fixtures

The recommended posture is:

1. keep `ExecutionPlan` as the canonical public execution artifact
2. keep `PlanCore` as the internal identity/hash view
3. keep `RunExecutionPolicy` as the execution-policy boundary
4. do **not** change `PlanRef`
5. do **not** change `IProviderAdapter.startRun(...)` at this time

If a future slice needs operational `PlanCore` consumption for measurable
reasons such as cache-keying, transport reduction, or adapter-neutral replay
input, that should be a new, deliberate implementation slice with its own ADR.

## Current state

```mermaid
flowchart LR
  planner[Planner] --> build[PlannerBuildResultV1]
  build --> plan[ExecutionPlan]
  build --> policy[RunExecutionPolicy]
  build --> corejson[canonicalPlanCoreJson]

  plan --> planmeta["metadata.planId\nmetadata.planVersion\nmetadata.schemaVersion\nmetadata.contractVersion\nmetadata.inputHashSha256\nmetadata.createdAtIso\nmetadata.plannerVersion?\nmetadata.plannerGitSha?"]
  plan --> steps[steps]
  plan --> obs[observability?]

  ref[PlanRef] --> engine[Engine]
  engine --> fetch[PlanIntegrityValidator]
  fetch --> plan
  fetch --> policy

  engine --> adapter[IProviderAdapter.startRun(plan, planRef, ctx)]
```

This state already has the important boundary split:

- `ExecutionPlan` = planner-owned execution definition
- `RunExecutionPolicy` = engine admission/runtime compatibility policy
- `PlanCore` = type-level identity subset used for `planId` derivation

The remaining gap is only that `PlanCore` is not a first-class operational
input anywhere except hashing and planner build verification.

## Existing split in code

The current code already defines:

- `PlanCore`
- `ExecutionPlan`
- `RunExecutionPolicy`
- `PlanRef`

That means DVT is not deciding whether to create a new abstraction.

It is deciding whether to consume the existing abstraction operationally.

## Field-by-field allocation

### A. `ExecutionPlan` vs `PlanCore`

| Field                      | Current location              | PlanCore? | If operational split is introduced        | Recommendation                                          |
| -------------------------- | ----------------------------- | --------- | ----------------------------------------- | ------------------------------------------------------- |
| `metadata.planVersion`     | `ExecutionPlan.metadata`      | yes       | consumed via `PlanCore`                   | keep in `ExecutionPlan`; expose in `PlanCore` view only |
| `metadata.inputHashSha256` | `ExecutionPlan.metadata`      | yes       | consumed via `PlanCore`                   | keep in `ExecutionPlan`; expose in `PlanCore` view only |
| `steps`                    | `ExecutionPlan.steps`         | yes       | consumed via `PlanCore`                   | keep in `ExecutionPlan`; expose in `PlanCore` view only |
| `metadata.planId`          | `ExecutionPlan.metadata`      | no        | consumed via envelope/identity metadata   | keep in `ExecutionPlan`                                 |
| `metadata.schemaVersion`   | `ExecutionPlan.metadata`      | no        | consumed via envelope/identity metadata   | keep in `ExecutionPlan`                                 |
| `metadata.contractVersion` | `ExecutionPlan.metadata`      | no        | consumed via envelope/identity metadata   | keep in `ExecutionPlan`                                 |
| `metadata.createdAtIso`    | `ExecutionPlan.metadata`      | no        | consumed via envelope/identity metadata   | keep in `ExecutionPlan`                                 |
| `metadata.plannerVersion`  | `ExecutionPlan.metadata`      | no        | consumed via envelope/identity metadata   | keep in `ExecutionPlan`                                 |
| `metadata.plannerGitSha`   | `ExecutionPlan.metadata`      | no        | consumed via envelope/identity metadata   | keep in `ExecutionPlan`                                 |
| `observability.tags`       | `ExecutionPlan.observability` | no        | consumed via envelope/diagnostic metadata | keep in `ExecutionPlan`                                 |
| `observability.extra`      | `ExecutionPlan.observability` | no        | consumed via envelope/diagnostic metadata | keep in `ExecutionPlan`                                 |

### B. Outside `ExecutionPlan`

These are already split and should remain split:

| Field / concern                  | Current location           | Recommendation               |
| -------------------------------- | -------------------------- | ---------------------------- |
| `pluginCompatibilityFingerprint` | `RunExecutionPolicy`       | keep outside `ExecutionPlan` |
| `requiresCapabilities`           | `RunExecutionPolicy`       | keep outside `ExecutionPlan` |
| dispatch target                  | `RunContext.targetAdapter` | keep outside `ExecutionPlan` |
| artifact identity/integrity      | `PlanRef`                  | keep outside `ExecutionPlan` |

## Candidate operational shapes

### Option A. Keep current operational consumption

Current flow:

- planner emits `ExecutionPlan + RunExecutionPolicy + canonicalPlanCoreJson`
- engine fetches and validates `ExecutionPlan`
- engine passes `ExecutionPlan + PlanRef + ResolvedRunContext` to adapters

Pros:

- no churn
- no signature change
- no plan-store migration
- current public contracts stay accurate
- boundary smell already fixed by ADR-0046

Cons:

- `PlanCore` remains mainly a hashing/verification view rather than an explicit
  runtime input

### Option B. Internal-only operational split inside engine

Potential flow:

- engine fetches `ExecutionPlan`
- engine derives `PlanCore` view locally
- engine continues calling adapters with the existing `ExecutionPlan`

Pros:

- can centralize internal identity logic on `PlanCore`
- no adapter contract break
- no `PlanRef` change

Cons:

- low value because `PlanIntegrityValidator` already derives `PlanCore` for
  `planId` verification
- adds another internal concept to pass around with little new capability

### Option C. Full operational split across adapter boundary

Potential flow:

- engine fetches `ExecutionPlan`
- engine derives or stores:
  - `PlanCore`
  - `ExecutionEnvelopeMetadata`
- adapter signature changes from:
  - `startRun(plan, planRef, ctx)`
- to something like:
  - `startRun(planCore, planEnvelope, planRef, ctx)`

Pros:

- makes the type-level split operationally explicit everywhere

Cons:

- high churn for low gain
- adapter signature break
- state-store artifact and resolver churn
- `ExecutionPlan` remains canonical anyway, so the system would now maintain
  both a public canonical artifact and a second operational decomposition

## Recommendation

Adopt **Option A**.

Option B is acceptable only if a future refactor needs a local helper type for
clarity, but it is not worth a dedicated architecture slice now.

Option C is **not worth doing now**.

## Why Option C is not worth doing now

### 1. The important boundary problem is already solved

Before ADR-0046, `ExecutionPlan` mixed:

- plan identity/definition
- runtime policy

That problem is already fixed.

What remains is not a bad boundary. It is only a question of whether a
type-level hashing view should become a first-class runtime input.

That is a much weaker reason to change public contracts.

### 2. The adapter boundary does not need the split

Current adapter input:

- `ExecutionPlan`
- `PlanRef`
- `ResolvedRunContext`

This is already coherent:

- `ExecutionPlan` gives executable steps and canonical metadata
- `PlanRef` gives artifact identity/integrity
- `ResolvedRunContext` gives dispatch/runtime context

Changing `IProviderAdapter.startRun(...)` would be a broad ripple with no clear
runtime capability unlocked.

### 3. `PlanCore` is primarily an identity view, not a better execution view

`PlanCore` contains:

- `planVersion`
- `inputHashSha256`
- `steps`

That is perfect for:

- `planId` derivation
- canonical plan-core JSON proofs
- deterministic equality checks

It is not obviously a better execution artifact than `ExecutionPlan`, because
the runtime still needs metadata that lives outside `PlanCore`.

### 4. Mature systems separate definition from policy, not necessarily into two runtime payloads

Temporal, Step Functions, Airflow, and Conductor all separate:

- execution definition
- runtime/deployment policy

But they do not all insist on operationally passing around a separate
definition-core subset once the canonical definition is already clean.

The mature-system lesson is:

- separate ownership
- do not overbuild internal decomposition unless it enables something real

### 5. Fowler would not split a clean object just because a helper type exists

The Fowler-aligned move was ADR-0046:

- remove policy drift from the public plan artifact

After that correction, a further split is only justified if it buys one of:

- lower coupling at a real boundary
- lower change frequency at a real boundary
- lower transport/storage cost
- clearer invariants with less code

Today it does not clearly buy any of those.

## PlanRef impact analysis

## Current role

`PlanRef` currently carries:

- `uri`
- `sha256`
- `schemaVersion`
- `planId`
- `planVersion`
- optional `sizeBytes`
- optional `expiresAt`

This is already the correct role:

- artifact location
- integrity
- compatibility
- identity

## If operational `PlanCore` split were introduced

No `PlanRef` field should move.

No `PlanRef` field should be added.

No `PlanRef` field should be removed.

Reason:

- `PlanRef` references the canonical artifact
- it is not the right place to mirror `PlanCore`
- it is not the right place to carry execution-envelope concerns

## Recommendation

`PlanRef` impact should be **none**.

If a future proposal requires `PlanRef` changes to support operational
`PlanCore` consumption, that is a strong signal the proposal is overreaching.

## `parsePlanRef` and Zod parser impact analysis

## Current state

- `PlanRefSchema` in [schemas.ts](../../../../packages/@dvt/contracts/src/schemas.ts)
- `parsePlanRef(...)` in
  [validation.ts](../../../../packages/@dvt/contracts/src/validation.ts)

Current schema is intentionally narrow and correct for the current role.

## If operational `PlanCore` split were introduced

Recommended parser impact: **none**.

Why:

- parser responsibility is shape validation for artifact references
- parser does not need to know about `PlanCore`
- parser does not need to validate any execution-envelope decomposition

Adding `PlanCore`-specific fields or envelope fields to `PlanRefSchema` would
weaken the boundary rather than improve it.

## Recommendation

- no `PlanRefSchema` change
- no `parsePlanRef(...)` change
- no new Zod parser for a `PlanCoreRef`

Only introduce a runtime `PlanCore` parser if the system starts persisting or
transporting `PlanCore` as its own artifact. That is not recommended now.

## `IProviderAdapter.startRun(plan, planRef, ctx)` impact analysis

## Current signature

```ts
startRun(plan: ExecutionPlan, planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef>;
```

## What would change under a full operational split

Possible alternatives:

1. `startRun(planCore, planEnvelope, planRef, ctx)`
2. `startRun(planCore, planRef, ctx, executionMetadata)`
3. `startRun(planArtifact, ctx)` where `planArtifact` is a new wrapper

All three create a breaking ripple through:

- `@dvt/contracts`
- `@dvt/engine`
- `@dvt/adapter-temporal`
- adapter stubs
- engine fixtures
- API integration tests

## Value assessment

The signature change would only be justified if adapters materially benefited
from consuming `PlanCore` directly.

They currently do not.

Temporal needs the executable plan plus canonical metadata and `PlanRef` for
emitted events and workflow input. `PlanCore` alone is not enough, and
splitting the rest into another object would increase call complexity without
removing a real ambiguity.

## Recommendation

Do **not** change `IProviderAdapter.startRun(...)`.

If a future slice can show:

- measurable payload reduction
- simpler replay input
- or clearer adapter determinism constraints

then this question can be reopened with concrete evidence.

## Compatibility and migration posture

The repository is still in development, so compatibility is not the main
constraint.

That does **not** automatically make the split worth doing.

The correct migration posture is:

- prefer the best boundary change when it removes a real defect
- avoid contract churn when the remaining gain is mostly conceptual

Applied here:

- ADR-0046 was worth doing because it removed a real mixed-ownership defect
- operational `PlanCore` consumption is not worth doing yet because the
  remaining gain is marginal

### Migration posture if implementation is forced later

If the repository later chooses to implement operational `PlanCore`
consumption anyway, the least bad posture is:

1. keep `ExecutionPlan` as the canonical persisted artifact
2. derive `PlanCore` as an internal runtime view first
3. prove concrete value
4. only then consider adapter-boundary changes

That means:

- no big-bang contract rewrite first
- no `PlanRef` rewrite
- no public claim that `ExecutionPlan` is deprecated

## Explicit ARC-2 scope if implementation proceeds

If implementation proceeds beyond this spike, ARC-2 definitely applies.

### Minimum likely scope

- `packages/@dvt/contracts/**`
- `packages/@dvt/engine/**`
- `packages/@dvt/planner/**`

Reason:

- `PlanCore` and parser/contract surfaces live in `@dvt/contracts`
- engine integrity/admission and adapter call sites live in `@dvt/engine`
- planner build output and identity proofs live in `@dvt/planner`

### Expanded likely scope if adapter boundary changes

- `packages/@dvt/adapter-temporal/**`
- `packages/@dvt/adapter-postgres/**`

Reason:

- Temporal would need `startRun(...)` signature and workflow-input updates
- plan-store/fetch artifacts would need mapper/fetcher updates if any artifact
  shape changes

### API ripple likely but not ARC-triggering by itself

- `apps/api/**`

Reason:

- stored-plan resolution and engine integration tests would likely need updates

### Required ARC outputs if implementation proceeds

- evidence doc
- risk register update
- `docs:sync`
- validations covering contracts, planner, engine, and any touched adapters

## Decision

The split is **not worth doing now as an implementation slice**.

What is worth doing now is freezing this rule:

- `PlanCore` remains the identity/hash view
- `ExecutionPlan` remains the canonical public execution artifact
- `RunExecutionPolicy` remains the execution-policy boundary
- `PlanRef` remains identity/integrity only
- adapter `startRun(...)` remains unchanged

## Acceptance decision

This spike provides enough detail to decide:

- what stays in `ExecutionPlan`
- what already lives outside it
- what an operational split would impact
- why the split is not worth implementing now

No implementation should start from this spike unless a later slice can show a
concrete boundary or runtime win that current contracts do not already provide.

## References

- [ADR-0042](../../../adr/ADR-0042-execution-plan-canonical-identity-unification.md)
- [ADR-0043](../../../adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md)
- [ADR-0046](../../../adr/ADR-0046-execution-plan-definition-and-run-execution-policy-separation.md)
- [ExecutionPlan.v1.ts](../../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts)
- [types/contracts.ts](../../../../packages/@dvt/contracts/src/types/contracts.ts)
- [IProviderAdapter.ts](../../../../packages/@dvt/engine/src/adapters/IProviderAdapter.ts)
