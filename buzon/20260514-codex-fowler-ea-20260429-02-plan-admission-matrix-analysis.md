# EA-20260429-02 Fowler Analysis: Plan Admission Matrix

Date: 2026-05-14  
Author: Codex  
Task: EA-20260429-02

## Architectural Reading

The branch now has a canonical `@dvt/contracts` admission matrix that binds
`ExecutionPlan.metadata.planVersion` to `ExecutionPlan.metadata.schemaVersion`.
Engine start-run policy already consumes that matrix. The remaining drift was
inside `@dvt/plan-verifier`: adapter-side verification still held a local
runtime matrix keyed only by `planVersion`.

## Fowler Comparison

Mature systems keep version admission as a published language and shared-kernel
policy, not as runtime-local lists. A runtime may adapt error wording or local
authorization, but compatibility facts belong in one executable registry.

The target shape is:

- Shared kernel publishes admitted `(planVersion, schemaVersion)` pairs.
- Engine ingress and adapter-side verification consume the same truth.
- Runtime-specific adapters remain consumers, not authors, of compatibility.
- Architecture tests reject local shadow matrices and semver fallback language.

## Improved Patterns

- **Published Language**: `EXECUTION_PLAN_ADMISSION_MATRIX` names the current
  compatibility truth in contracts and verifier docs.
- **Shared Kernel**: `@dvt/plan-verifier` re-exports and consumes the contracts
  matrix instead of copying admitted versions.
- **Fail Fast**: `verifyPlanOrThrow` checks pair admission before hashing.
- **Ports and Adapters**: adapter verification remains a facade around shared
  policy, keeping provider execution behind admitted plan references.

## Anti-Patterns Detected

- **Duplicate truth**: `PLAN_RUNTIME_ADMISSION_MATRIX` duplicated part of the
  contracts policy while omitting `schemaVersion`.
- **Primitive obsession**: version compatibility was treated as a bare string
  list instead of a semantic pair.
- **Documentation drift**: README and component docs still described
  plan-version-only admission after engine admission moved to pair semantics.
- **Insufficient architecture test**: the guard checked for admission language,
  but not for canonical matrix ownership or schema-axis coverage.

## Components To Group

- `@dvt/contracts` owns admitted pair publication.
- `@dvt/engine` owns start-run admission before fetch or dispatch.
- `@dvt/plan-verifier` owns adapter-side pair admission before hash checks.
- Runtime adapters consume verifier helpers before provider-specific execution.
- Component docs and user stories group API, invariants, transitions,
  consumers, and drift guards.

## Repetition

The same admission idea appeared as:

- contracts pair matrix;
- engine `PlanAdmissionPolicy`;
- engine `PlanSchemaVersionPolicy`;
- plan-verifier local runtime matrix;
- README and component docs.

EA-20260429-02 removes the plan-verifier duplicate and makes it a facade over
the contracts matrix.

## Opportunities

- Keep future plan/schema migrations as matrix edits plus consumer tests.
- Extend adapter-specific integration tests to call verifier admission whenever
  an adapter starts from persisted plan bytes.
- Use the same shared-kernel facade pattern for other contract vocabularies
  that currently appear as local arrays.

## Drift Fixed

- Code drift: adapter-side verification now requires `schemaVersion`.
- Documentation drift: README and component guide name the canonical matrix.
- Test drift: architecture guard rejects local runtime matrices and
  `admittedPlanVersions`.

## Teaching For Future Work

When a version rule has more than one axis, avoid exposing one-axis helper names
as the main API. Name the domain decision directly (`PlanAdmission`) and make
all consumers depend on the same executable registry.
