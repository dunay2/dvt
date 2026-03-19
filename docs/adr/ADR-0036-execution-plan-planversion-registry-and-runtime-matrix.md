---
title: ADR-0036 - ExecutionPlan planVersion registry and runtime compatibility matrix
status: Accepted
owner: Architecture / Planner / Contracts / Engine
last_reviewed: 2026-03-19
---

# ADR-0036 - ExecutionPlan planVersion registry and runtime compatibility matrix

## Status

Accepted.

## Context

`ExecutionPlanV2.metadata.planVersion` was modeled as the string literal `'2.3'`
inside `@dvt/contracts`.

That shape created two problems:

- every plan-version bump required replacing the literal in the canonical
  contracts package;
- runtime compatibility was implicit and inferred ad hoc instead of being
  governed by an executable compatibility source.

The result was effectively a big-bang cutover model. A future `2.4` or `3.0`
plan could not be represented as a normal additive contract evolution plus an
explicit runtime rollout policy.

ADR-0035 already defines who owns public planner contract evolution. This ADR
defines the concrete mechanism for `planVersion` evolution itself.

## Decision

### 1. `planVersion` is governed by a registry, not an inline literal

`@dvt/contracts` owns a canonical plan-version registry:

- `CURRENT_EXECUTION_PLAN_VERSION`
- `SUPPORTED_EXECUTION_PLAN_VERSIONS`
- `EXECUTION_PLAN_VERSION_REGISTRY`

`PlanCore` and `ExecutionPlanV2` are expressed as versioned unions derived from
that registry instead of a single inline literal type.

This means adding a new supported plan version is done by extending the
registry and adding the corresponding versioned schema entry, not by replacing a
hardcoded literal across the package.

### 2. Runtime support is governed by an explicit compatibility matrix

`@dvt/plan-verifier` owns the executable runtime compatibility matrix:

- `PLAN_RUNTIME_COMPATIBILITY_MATRIX`

Compatibility is validated against the matrix by runtime name, not inferred only
from semver major/minor math.

The matrix is the operational source of truth for questions such as:

- which runtimes accept `2.3`;
- which runtimes still reject `2.4`;
- when a rollout window is complete.

### 3. Planner emission uses the canonical current-version constant

The planner MUST emit `CURRENT_EXECUTION_PLAN_VERSION`.

The planner MUST NOT reintroduce an inline string literal for
`metadata.planVersion`.

### 4. Adding a new plan version requires a bounded change set

Adding a new supported plan version now requires:

1. Extend the registry in `@dvt/contracts`.
2. Add the versioned schema entry for the new plan shape.
3. Update planner emission only when the planner is ready to produce that
   version.
4. Update `PLAN_RUNTIME_COMPATIBILITY_MATRIX` for each runtime that can accept
   it.
5. Add or update tests that prove acceptance/rejection paths.

The contracts package major version does not need to change solely because a new
plan version is added to the union.

## Consequences

### Positive

- Removes the inline-literal trap from the public planner contract.
- Makes plan-version rollout policy executable and testable.
- Keeps planner emission centralized in one constant.
- Allows consumers to reject unsupported versions explicitly during staged
  rollout.

### Negative

- Adds two governance surfaces that must stay aligned: contract registry and
  runtime matrix.
- Adding a new plan version now requires touching schemas and runtime policy on
  purpose, which is extra ceremony but intentional.

## Verification

- `@dvt/contracts` exposes a version registry and versioned plan schemas.
- `@dvt/contracts` rejects undeclared `planVersion` values at runtime.
- `@dvt/plan-verifier` exposes `PLAN_RUNTIME_COMPATIBILITY_MATRIX`.
- `@dvt/plan-verifier` accepts or rejects plan versions by runtime using that
  matrix.

## Related

- [ADR-0017_ExecutionPlan_Schema_Versioning.md](ADR-0017_ExecutionPlan_Schema_Versioning.md)
- [ADR-0035-planner-public-contract-evolution-protocol.md](ADR-0035-planner-public-contract-evolution-protocol.md)
