---
title: ADR-0042 - ExecutionPlan canonical identity unification
status: Accepted
owner: Architecture / Planner / Contracts / Engine / API
last_reviewed: 2026-04-01
---

# ADR-0042 - ExecutionPlan canonical identity unification

## Status

Accepted.

## Context

The repository had drifted into three public `ExecutionPlan` shapes:

- planner-side `ExecutionPlanV2` in `@dvt/contracts`
- engine-visible `ExecutionPlan` declared in `IRunStateStore.v1.ts`
- engine-local `ExecutionPlan` declared in `packages/@dvt/engine/src/contracts/executionPlan.ts`

That split created a silent failure mode: planner output could evolve, API code
could bridge or rewrite it, and the engine could accept a different shape under
the same conceptual name. The schema and runtime contracts therefore looked
aligned while type identity had already diverged.

The problem was visible in four governance areas:

- ADR-0017 requires `schemaVersion` to be mandatory and governed as the plan
  format version.
- ADR-0018 makes `@dvt/contracts` the owner of serializable cross-package
  contracts.
- ADR-0035 defines planner semantic authorship for the public planner contract.
- ADR-0036 governs `planVersion` as a registry concern rather than an inline
  literal rollout trick.

Without a unification ADR, those decisions could remain individually true while
planner, API, and engine continued to consume distinct `ExecutionPlan` public
types.

## Decision

### 1. One canonical public `ExecutionPlan`

`@dvt/contracts` is the only canonical home of the public `ExecutionPlan`
contract.

- The canonical exported symbol is now `ExecutionPlan`.
- `ExecutionPlanV2` remains only as a deprecated compatibility alias during the
  migration window.
- Engine-visible and engine-local `ExecutionPlan` symbols must be aliases or
  re-exports of that canonical contract, never independent interfaces.

### 2. Canonical metadata shape

The canonical `ExecutionPlan.metadata` now requires:

- `planId`
- `planVersion`
- `schemaVersion`
- `contractVersion`
- `inputHashSha256`
- `createdAtIso`

It may additionally include:

- `plannerVersion`
- `plannerGitSha`
- `requiresCapabilities`
- `fallbackBehavior`
- `targetAdapter`

`createdAtIso` is the only canonical timestamp field on the public plan
metadata. `generatedAt` is removed from the contract surface.

### 3. Canonical step shape

The canonical shared step shape requires:

- `stepId`
- `kind`
- `dependsOn`

It may additionally include:

- `stepTypeConfig`
- `type`
- `gateway`

The engine-local open-record widening is retired. Adapter and runtime consumers
must depend on this governed shared step contract rather than inventing local
extensions.

### 4. Canonical schema and parser

`@dvt/contracts` owns the only canonical runtime schema and parser for the
public plan:

- `ExecutionPlanSchema`
- `parseExecutionPlan`

`ExecutionPlanV2Schema` and `parseExecutionPlanV2` remain compatibility aliases
to the same underlying schema and parser during migration.

### 5. Canonical constants

`@dvt/contracts` owns the current plan-format constants:

- `CURRENT_EXECUTION_PLAN_SCHEMA_VERSION = 'v1.2'`
- `CURRENT_EXECUTION_PLAN_CONTRACT_VERSION = '1.0.0'`

Planner, API, and engine validation must reuse those constants rather than
redeclaring local literals.

### 6. Planner emission and plan identity remain separate concerns

The planner must emit the canonical contract directly.

- `schemaVersion`, `contractVersion`, and `createdAtIso` are emitted on the
  final plan metadata.
- `planId` and `canonicalPlanJson` semantics remain unchanged and continue to be
  derived only from `PlanCore`.
- `schemaVersion`, `contractVersion`, and `createdAtIso` do not participate in
  the plan hash.

This aligns ADR-0017 with ADR-0036: `schemaVersion` is mandatory and governed,
but it is not the idempotency or content-address identity field.

### 7. API storage and engine consumption are direct

The API persists and reloads the planner-emitted canonical plan directly.

- API code must parse stored plans with `parseExecutionPlan`.
- The previous planner-to-engine structural conversion path is removed as a
  semantic boundary.
- Engine compatibility surfaces may exist only as re-exports for migration, not
  as alternate public shapes.

### 8. Drift prevention is enforced in tests

Contract tests must prove:

- a canonical planner fixture validates through `ExecutionPlanSchema`
- planner-visible `ExecutionPlan` is assignable to the engine-visible
  `ExecutionPlan`
- engine public `ExecutionPlan` is a re-exported identity, not a divergent
  local shape

This turns type identity into an executable contract instead of a documentation
claim.

## Consequences

### Positive

- Planner, API, engine, and adapters now share one public `ExecutionPlan`
  identity.
- Schema drift becomes visible at compile time and runtime parsing time.
- `schemaVersion` and `contractVersion` are emitted and validated uniformly.
- The API no longer needs to silently reshape the planner contract before
  persistence or execution.

### Trade-offs

- Existing compatibility aliases must remain temporarily to avoid immediate
  import churn.
- Downstream consumers that relied on engine-local widening now have to align to
  the governed shared shape explicitly.

## Alignment With Prior ADRs

### ADR-0017

This ADR operationalizes ADR-0017 by making `schemaVersion` mandatory on the
canonical public `ExecutionPlan`, centralizing the current schema constant, and
keeping schema validation separate from `planId` hashing.

### ADR-0018

This ADR closes the ownership loophole left by duplicate public interfaces.
Serializable cross-package `ExecutionPlan` structure belongs to
`@dvt/contracts`, not to engine-local compatibility files.

### ADR-0035

Planner remains the semantic author of the public planner contract, but that
contract now has exactly one public identity in the shared kernel instead of a
planner shape and an engine shadow shape.

### ADR-0036

`planVersion` remains governed by the plan-version registry and compatibility
matrix. This ADR does not change rollout semantics; it only ensures that all
consumers read the same public plan shape while those semantics are applied.

## Verification

- `ExecutionPlanSchema` validates the canonical planner fixture.
- `parseExecutionPlan` is the API/runtime parser of record.
- `IRunStateStore.v1.ts` exposes the canonical `ExecutionPlan` by alias.
- `packages/@dvt/engine/src/contracts/executionPlan.ts` is a pure re-export
  compatibility layer.
- Planner determinism tests prove `canonicalPlanJson` still excludes
  `planId`, `createdAtIso`, `schemaVersion`, and `contractVersion`.
- API integration tests assert direct canonical planner-to-engine compatibility
  without bridge reshaping.

## References

- [ADR-0017_ExecutionPlan_Schema_Versioning.md](ADR-0017_ExecutionPlan_Schema_Versioning.md)
- [ADR-0018_Shared_Kernel_Ownership_Governance.md](ADR-0018_Shared_Kernel_Ownership_Governance.md)
- [ADR-0035-planner-public-contract-evolution-protocol.md](ADR-0035-planner-public-contract-evolution-protocol.md)
- [ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md](ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md)
