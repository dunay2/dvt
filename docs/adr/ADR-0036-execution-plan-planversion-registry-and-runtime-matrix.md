---
title: ADR-0036 - ExecutionPlan planVersion registry and runtime admission matrix
status: Accepted
owner: Architecture / Planner / Contracts / Engine
last_reviewed: 2026-03-19
---

# ADR-0036 - ExecutionPlan planVersion registry and runtime admission matrix

## Status

Accepted.

## Context

`ExecutionPlanV1.metadata.planVersion` was previously modeled as a non-canonical
inline string literal inside `@dvt/contracts`.

That shape created two problems:

- every plan-version bump required replacing the literal in the canonical
  contracts package;
- runtime compatibility was implicit and inferred ad hoc instead of being
  governed by an executable compatibility source.

The result was effectively an implicit cutover model. During active
development, this repository uses only `planVersion = 1.0`; any future
plan-version line is outside the current development contract and requires a
fresh governance decision before it becomes active.

ADR-0035 already defines who owns public planner contract evolution. This ADR
defines the concrete mechanism for `planVersion` evolution itself.

## Decision

### 1. `planVersion` is governed by a registry, not an inline literal

`@dvt/contracts` owns a canonical plan-version registry:

- `CURRENT_EXECUTION_PLAN_VERSION`
- `SUPPORTED_EXECUTION_PLAN_VERSIONS`
- `EXECUTION_PLAN_VERSION_REGISTRY`

`PlanCore` and `ExecutionPlanV1` are expressed as versioned unions derived from
that registry instead of a single inline literal type.

During active development, the registry contains exactly the single active
`1.0` plan-version line. The registry exists to avoid scattered literals, not
to imply that multiple plan-version lines are currently active.

### 2. Runtime support is governed by an explicit admission matrix

The contract/runtime surface owns the executable admission matrix:

- `EXECUTION_PLAN_ADMISSION_MATRIX`

Admission is validated against the exact `(planVersion, schemaVersion)` pair,
not inferred from semver major/minor math.

The matrix is the operational source of truth for questions such as:

- which exact pair is executable now;
- whether a future pair has been deliberately admitted;
- whether an undeclared pair must fail before adapter dispatch.

### 3. Planner emission uses the canonical current-version constant

The planner MUST emit `CURRENT_EXECUTION_PLAN_VERSION`.

The planner MUST NOT reintroduce an inline string literal for
`metadata.planVersion`.

### 4. New plan-version lines are out of current development scope

Adding any supported plan version beyond `1.0` is not part of the current
development contract. If that changes, the work requires a bounded governance
change set:

1. Extend the registry in `@dvt/contracts`.
2. Add the versioned schema entry for the new plan shape.
3. Update planner emission only when the planner is ready to produce that
   version.
4. Replace the active `EXECUTION_PLAN_ADMISSION_MATRIX` pair when runtime
   admission is ready.
5. Add or update tests that prove acceptance/rejection paths.

The contracts package major version does not need to change solely because a
future plan-version line is introduced, but that future line still requires
explicit ADR, matrix, tests, evidence, and risk updates before becoming active.

## Consequences

### Positive

- Removes the inline-literal trap from the public planner contract.
- Makes plan-version admission policy executable and testable.
- Keeps planner emission centralized in one constant.
- Allows consumers to reject unsupported versions explicitly during hard-cut
  contract changes.

### Negative

- Adds two governance surfaces that must stay aligned: contract registry and
  runtime matrix.
- Any future plan-version line requires touching governance, schemas, tests, and
  runtime policy on purpose, which is extra ceremony but intentional.
- Older plan/schema pairs remain undeclared unless they are the active pair.

## Verification

- `@dvt/contracts` exposes a version registry and versioned plan schemas.
- `@dvt/contracts` rejects undeclared `planVersion` values at runtime.
- `@dvt/contracts` exposes `EXECUTION_PLAN_ADMISSION_MATRIX`.
- `@dvt/engine` accepts or rejects start-run admission using that matrix before
  adapter dispatch.

## Related

- [ADR-0017_ExecutionPlan_Schema_Versioning.md](./ADR-0017_ExecutionPlan_Schema_Versioning.md)
- [ADR-0035-planner-public-contract-evolution-protocol.md](./ADR-0035-planner-public-contract-evolution-protocol.md)
