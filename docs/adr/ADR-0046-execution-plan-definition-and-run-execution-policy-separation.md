---
title: ADR-0046 - Execution plan definition and run execution policy separation
status: Accepted
owner: Architecture / Planner / Engine / API / Contracts
last_reviewed: 2026-04-07
---

# ADR-0046 - Execution plan definition and run execution policy separation

## Status

Accepted.

## Context

`ADR-0042` correctly unified public `ExecutionPlan` identity in `@dvt/contracts`,
but it kept two different concerns on the same public artifact:

- planner-owned plan definition and identity
- engine-owned runtime compatibility and admission policy

The current mixed fields are:

- `pluginCompatibilityFingerprint`
- `requiresCapabilities`
- `fallbackBehavior`
- `targetAdapter`

This is not a cosmetic issue.

- `planId` is already derived only from `PlanCore`.
- `ExecutionPlan` is the canonical persisted plan artifact per `ADR-0043`.
- engine admission and runtime compatibility are governed by `ADR-0012` and
  `ADR-0014`, not by planner topology ownership.

When plan definition and execution policy share one public artifact, the
contract changes for two unrelated reasons:

- the workflow topology changed
- execution admission policy changed

That creates boundary drift and weakens ownership.

## Decision

### 1. `ExecutionPlan` remains the canonical public plan artifact

`ExecutionPlan` remains the single canonical public plan artifact in
`@dvt/contracts`.

It is planner-owned and contains:

- canonical metadata required for plan identity and versioning
- the executable step graph
- existing non-policy planner metadata that is not reclassified by this ADR

### 2. Runtime compatibility and admission policy move out of `ExecutionPlan`

The following fields are no longer part of `ExecutionPlan.metadata`:

- `pluginCompatibilityFingerprint`
- `requiresCapabilities`
- `fallbackBehavior`
- `targetAdapter`

They are not planner-owned plan-definition fields.

### 3. Introduce `RunExecutionPolicy`

`RunExecutionPolicy` is a new serializable engine-facing contract published from
`@dvt/contracts`.

Its initial scope is intentionally minimal and code-grounded:

- `pluginCompatibilityFingerprint`
- `requiresCapabilities`

`fallbackBehavior` is removed from the canonical shared contract in this slice
because the repository does not implement or enforce it as a real execution
policy today.

`targetAdapter` is not part of `RunExecutionPolicy` because runtime dispatch
ownership already belongs to `RunContext.targetAdapter`.

### 4. `PlannerBuildResultV1` publishes definition and policy separately

The planner now publishes:

- `plan: ExecutionPlan`
- `executionPolicy: RunExecutionPolicy`
- `canonicalPlanJson`

This preserves one canonical plan artifact while separating the engine-owned
execution policy boundary.

### 5. `PlanRef` is plan identity and integrity only

`PlanRef` references:

- artifact location
- artifact hash
- plan identity
- schema/contract version compatibility

`PlanRef` no longer carries runtime compatibility or capability requirements.

### 6. Stored plan artifacts remain singular

Per `ADR-0043`, the persisted canonical plan artifact remains singular.

- `canonicalPlanJson` continues to store the canonical `ExecutionPlan`
- `RunExecutionPolicy` is stored as sidecar execution metadata, not as a second
  canonical plan artifact

This ADR does not introduce dual first-class plan payloads.

### 7. Engine admission consumes verified plan plus execution policy

The engine continues to own authoritative pre-dispatch plan verification per
`ADR-0012`.

After this change, the engine also consumes `RunExecutionPolicy` as a separate
input to:

- capability validation
- plugin compatibility checks
- runExecutionContext compatibility checks

Adapters still receive the verified `ExecutionPlan` instance to execute.

## Consequences

### Positive

- `ExecutionPlan` stops changing for runtime-admission reasons
- planner-owned definition and engine-owned policy have explicit boundaries
- `planId` remains a plan-definition identity, not a policy identity
- stored plan artifacts remain singular and auditable

### Trade-offs

- start-run admission wiring becomes more explicit
- stored-plan persistence must carry policy sidecar metadata
- tests and fixtures must stop assuming runtime policy fields live on
  `ExecutionPlan.metadata`

## Partial supersession

This ADR supersedes the following parts of `ADR-0042`:

- the optional runtime-policy fields listed under canonical metadata shape
- any implication that runtime compatibility metadata belongs on the canonical
  public `ExecutionPlan`

This ADR does not supersede:

- one canonical public `ExecutionPlan`
- `@dvt/contracts` ownership of the public contract
- `planId` derivation from `PlanCore`
- direct planner/API/engine use of the canonical plan contract

## Alignment with existing ADRs

### ADR-0012

The engine still owns authoritative plan verification before dispatch.
The new execution-policy contract is consumed at the same engine boundary.

### ADR-0014

The adapter model remains run-driven. Adapters still receive the verified plan
instance and execute it under provider semantics.

### ADR-0042

The canonical plan identity unification remains correct. This ADR narrows the
canonical plan surface to planner-owned definition.

### ADR-0043

The plan store still persists one canonical plan artifact. Execution policy is
sidecar admission metadata, not a second canonical plan.

## Verification

- `ExecutionPlan` no longer validates policy fields on `metadata`
- planner build results expose `executionPolicy` separately from `plan`
- `PlanRef` no longer exposes policy fields
- engine admission validates capabilities and compatibility from
  `RunExecutionPolicy`, not from `ExecutionPlan.metadata` or `PlanRef`
- stored-plan adapters persist and reload sidecar execution policy without
  changing canonical plan identity

## References

- [ADR-0012-plan-integrity-ownership.md](ADR-0012-plan-integrity-ownership.md)
- [ADR-0014-run-driven-adapter-model.md](ADR-0014-run-driven-adapter-model.md)
- [ADR-0017_ExecutionPlan_Schema_Versioning.md](ADR-0017_ExecutionPlan_Schema_Versioning.md)
- [ADR-0042-execution-plan-canonical-identity-unification.md](ADR-0042-execution-plan-canonical-identity-unification.md)
- [ADR-0043-plan-record-plan-store-and-artifacts-ownership.md](ADR-0043-plan-record-plan-store-and-artifacts-ownership.md)
