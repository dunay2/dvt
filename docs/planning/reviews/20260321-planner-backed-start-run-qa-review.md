---
title: 20260321 Planner-Backed StartRun QA Review
status: Draft
owner: qa
last_reviewed: 2026-03-21
planning_type: review
---

# 20260321 Planner-Backed StartRun QA Review

- Reviewed change: `feat(api): Add planner-backed stored plan start flow (#533)`
- Reviewed commit on `main`: `f9602845`
- Review type: QA compliance review against normative contracts and runtime behavior
- Reviewer stance: hard QA / specification compliance review
- Verdict: **Partially compliant after remediation patches; remaining gaps are now concentrated in lifecycle reuse semantics and missing Temporal proof**

## 1. Governing sources used

- [ADR-0012 — Plan Integrity Ownership](../../adr/ADR-0012-plan-integrity-ownership.md)
- [ADR-0035 — Planner Public Contract Evolution Protocol](../../adr/ADR-0035-planner-public-contract-evolution-protocol.md)
- [PlanExecutabilityValidation.v1](../../../packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts)
- [PlanValidationLifecycle.v1](../../../packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts)
- [ExecutionPlan.v2 / PlannerInputEnvelopeV2](../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts)
- [Testing and CI Capabilities](../../guides/testing-and-ci-capabilities.md)

## 2. Executive summary

The slice is strong on boundary shape and happy-path orchestration:

- the HTTP route enforces the one-active-source rule,
- the API persists the canonical plan before executability validation,
- the lifecycle transitions align with the `PENDING_VALIDATION -> VALID|INVALID` model,
- and the local test suite for the implemented path is healthy.

The original review identified blocking defects in:

1. SHA-256 integrity enforcement for planner-backed `dvt-plan://` execution on the mock path;
2. silent `plan_id` collisions in `PostgresPlanStore.storePlan()`;
3. fail-open executability acceptance when an adapter omitted capability declaration.

Those items were re-reviewed and patched in the current remediation pass.

The slice is stronger now, but the remediation also exposed new lifecycle invariants that were not explicit in the first pass:

1. the persisted validation lifecycle is not adapter-scoped even though executability validation is adapter-specific;
2. strict `PENDING_VALIDATION -> VALID` semantics make concurrent duplicate admissions of the same canonical plan a race-prone path unless the contract explicitly defines single-owner behavior;
3. the API still lacks end-to-end proof that planner-backed stored plans execute correctly on the Temporal path.

## 3. What is correct

### 3.1. Boundary admission is directionally correct

The route only accepts either:

- a legacy `planRef` path, or
- exactly one planner-backed source among `graphSource`, `manifestRef`, `manifest`, or `nodes`.

That matches the one-active-source rule in the planner boundary contract.

Relevant implementation:

- [apps/api/src/entrypoints/http/startRunRoute.ts](../../../apps/api/src/entrypoints/http/startRunRoute.ts)
- [packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts](../../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts)

### 3.2. The high-level lifecycle ordering is aligned with the contract

The API sequence is:

1. build plan,
2. store plan,
3. validate executability by `PlanRef`,
4. mark `INVALID` on rejection,
5. mark `VALID` before `startRun`.

That matches the lifecycle contract's required caller sequence.

Relevant implementation:

- [apps/api/src/application/services/PlannerBackedStartRunUseCase.ts](../../../apps/api/src/application/services/PlannerBackedStartRunUseCase.ts)
- [packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts)

### 3.3. The store correctly gates runnable fetches by validation state

`fetch()` only allows `VALID`, while `fetchForValidation()` allows `PENDING_VALIDATION` and `VALID`.

That is consistent with the rule that `startRun` must not proceed on a plan that has not completed the lifecycle.

Relevant implementation:

- [packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts](../../../packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts)

### 3.4. Local tests cover the implemented happy path well

The slice has direct unit and integration tests for:

- route parsing,
- planner-backed orchestration,
- plan-state transitions,
- capability rejection,
- and protected runtime wiring with real PostgreSQL.

This is materially better than a thin, untested boundary patch.

## 4. Findings

### 4.1. Resolved — planner-backed `dvt-plan://` execution now enforces SHA-256 integrity on the mock path

#### Why this matters

ADR-0012 is explicit: the execution-side owner must fetch bytes and verify `sha256(bytes) == PlanRef.sha256` before execution. That is the core integrity invariant.

The Temporal worker path has that shape:

- [packages/@dvt/adapter-temporal/src/activities/stepActivities.ts](../../../packages/@dvt/adapter-temporal/src/activities/stepActivities.ts) calls `fetchAndValidate` and then `validatePlanAgainstRef`.

The remediation patch closes that gap by verifying the fetched bytes before parsing and by rejecting metadata mismatches on the stored executable plan path.

#### Evidence

- [ADR-0012](../../adr/ADR-0012-plan-integrity-ownership.md) states under adapter responsibilities that adapters must verify `sha256(bytes) == PlanRef.sha256`.
- [packages/@dvt/engine/src/adapters/mock/MockAdapter.ts](../../../packages/@dvt/engine/src/adapters/mock/MockAdapter.ts) still consumes an already parsed `ExecutionPlan`.
- [apps/api/src/application/services/StoredExecutablePlanResolver.ts](../../../apps/api/src/application/services/StoredExecutablePlanResolver.ts) now hashes the stored bytes against `planRef.sha256` and rejects `PLAN_REF_MISMATCH` before returning the parsed plan.
- [apps/api/test/application/services/StoredExecutablePlanResolver.test.ts](../../../apps/api/test/application/services/StoredExecutablePlanResolver.test.ts) now covers both SHA mismatch and metadata mismatch cases.

#### Why this is a spec violation

The mock execution path is now aligned with the byte-integrity requirement for stored plans.

#### Severity

**Resolved in remediation**

---

### 4.2. Resolved — `PostgresPlanStore.storePlan()` is now collision-aware and fail-closed on non-runnable contract violations

#### Why this matters

The lifecycle contract says `storePlan()` persists the canonical plan and returns the immutable `PlanRef` used for all subsequent validation and start operations.

The remediation patch now:

1. reads back the persisted row on conflict,
2. proves equivalence across `PlanRef`, capabilities, canonical JSON, and executable JSON,
3. returns the persisted row-derived `PlanRef`, and
4. rejects reuse once the existing row is already `VALID` or `INVALID`, because `storePlan()` is contractually required to return a non-runnable reference.

#### Evidence

- [packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts](../../../packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts) now reads the row back on conflict and throws `PLAN_STORE_CONFLICT` when the stored canonical/executable content differs.
- The same file now throws `PLAN_VALIDATION_STATE_REUSE_UNSUPPORTED` when a caller tries to reuse a row that is already `VALID` or `INVALID` via `storePlan()`.
- [packages/@dvt/adapter-postgres/test/PostgresPlanStore.test.ts](../../../packages/@dvt/adapter-postgres/test/PostgresPlanStore.test.ts) now covers identical pending reuse, conflicting collisions, and validated-plan reuse rejection.

#### Why this is a spec violation

The original silent-collision defect is fixed. The current behavior is now fail-closed rather than silent.

#### Severity

**Resolved in remediation**

---

### 4.3. Major — the lifecycle validity state is still global while executability validation is adapter-specific

#### Why this matters

`validatePlan(planRef, adapterId)` is explicitly adapter-specific, but the persisted lifecycle state in `PlanValidationLifecycle.v1` is a single global `PENDING_VALIDATION | VALID | INVALID` value keyed by plan.

That means there is no canonical persisted answer to:

- "VALID for which adapter?"
- "Can a plan validated on mock be reused on temporal without revalidation?"
- "Can one adapter's rejection permanently invalidate execution on every adapter?"

#### Evidence

- [packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts) validates by `(planRef, adapterId)`.
- [packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts](../../../packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts) persists only a single lifecycle state and rejection report per plan.
- The remediation patch therefore rejects `storePlan()` reuse for already validated rows instead of pretending the reuse semantics are known.

#### QA interpretation

This is now a **newly identified invariant**, not a silent runtime defect. The implementation has been hardened to fail closed, but the contract remains under-specified for reusable plans.

#### Severity

**Major**

---

### 4.4. Major — concurrent duplicate admission of the same canonical plan remains unproven

#### Why this matters

The store now tolerates an identical duplicate `storePlan()` only while the row remains `PENDING_VALIDATION`. But the lifecycle still requires `markValid()` / `markInvalid()` to throw on non-`PENDING_VALIDATION` states.

That means two concurrent admissions of the same plan can still race:

1. both observe the same persisted pending plan,
2. both validate,
3. one transitions to `VALID`,
4. the second caller hits an invalid transition.

#### QA interpretation

That may be acceptable if the contract intends a single validation owner per canonical plan, but the slice does not currently prove or document that concurrency rule.

#### Severity

**Major**

---

### 4.5. Major — the API admits `dvt-plan` for execution while runtime support is only demonstrated for the mock path, not end-to-end for Temporal

#### Why this matters

The protected runtime module explicitly allows `dvt-plan` as a legal scheme and validates planner-backed plans against whatever adapter is selected.

That is a strong product claim: planner-backed stored plans are not just buildable, they are executable on the chosen adapter.

#### Evidence

- [apps/api/src/modules/buildProtectedRuntimeModule.ts](../../../apps/api/src/modules/buildProtectedRuntimeModule.ts) allows `dvt-plan` in `planRefAllowedSchemes`.
- The same module wires `StoredPlanExecutabilityValidator` against the adapter map for admission-time acceptance.
- The protected integration test only proves the path for `targetAdapter: 'mock'`.
- A codebase search shows explicit byte-integrity execution wiring in Temporal activities, but no explicit `dvt-plan://postgres/...` support surfaced in the Temporal-side sources reviewed for this slice.

#### QA interpretation

This is not a proven runtime defect yet, but it is a **missing conformance proof** for a path the API appears to advertise. At minimum, the slice lacks the end-to-end evidence required to claim planner-backed stored-plan execution is adapter-complete.

#### Severity

**Major**

---

### 4.6. Resolved — executability validation no longer fails open when an adapter omits capability declaration

#### Why this matters

The validator now rejects plans that require capabilities when the target adapter does not declare any capability surface.

#### Evidence

- [apps/api/src/application/services/StoredPlanExecutabilityValidator.ts](../../../apps/api/src/application/services/StoredPlanExecutabilityValidator.ts) now rejects capability-required plans when the adapter does not declare capabilities.
- [apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts](../../../apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts) now covers the undeclared-capabilities case explicitly.

#### QA interpretation

The fail-open behavior identified in the original review is closed.

#### Severity

**Resolved in remediation**

---

### 4.7. Medium — the review surface still lacks Temporal end-to-end proof and explicit concurrency proof

#### Missing tests

The current test set now covers:

1. SHA mismatch rejection on stored plan execution,
2. metadata mismatch rejection on stored plan execution,
3. undeclared-capability rejection,
4. idempotent pending-store reuse,
5. conflicting plan collision rejection,
6. validated-plan reuse rejection.

It still does not demonstrate:

1. planner-backed execution for `targetAdapter: 'temporal'`,
2. accepted behavior for concurrent duplicate admissions of the same canonical plan.

#### Why this matters

The most severe original evidence gaps were closed, but the adapter-complete and concurrency-complete story is still unproven.

#### Severity

**Medium**

## 5. Compliance matrix against the specification

| Requirement                                                                        | Governing source                                               | Observed status                                                                                         | QA assessment               |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------- |
| Exactly one planner source at the public boundary                                  | `PlannerInputEnvelopeV2` contract                              | Route enforces mutual exclusivity and validates through `parsePlannerInputEnvelopeV2`                   | Compliant                   |
| Persist before executability validation                                            | `PlanExecutabilityValidation.v1`, `PlanValidationLifecycle.v1` | Use case stores first, validates second                                                                 | Compliant                   |
| `startRun` only after `VALID`                                                      | `PlanValidationLifecycle.v1`                                   | `fetch()` requires `VALID`; use case marks `VALID` before delegate call                                 | Compliant                   |
| Transition misuse must throw                                                       | `PlanValidationLifecycle.v1`                                   | Store throws on invalid transitions                                                                     | Compliant                   |
| Adapter/runtime must verify payload SHA against `PlanRef.sha256`                   | ADR-0012                                                       | Enforced on Temporal activity path and now enforced on stored-plan resolver path used by mock execution | Compliant for covered paths |
| Returned `PlanRef` must correspond to the persisted immutable plan                 | `PlanValidationLifecycle.v1`                                   | `storePlan()` now reads back and proves equivalence or throws `PLAN_STORE_CONFLICT`                     | Compliant                   |
| `storePlan()` must return a non-runnable ref                                       | `PlanValidationLifecycle.v1`                                   | reuse of `VALID`/`INVALID` rows is now rejected explicitly                                              | Compliant, fail-closed      |
| Executability gate should reject unsupported adapter capabilities                  | `PlanExecutabilityValidation.v1` intent                        | capability-required plans now reject when adapter omits capabilities                                    | Compliant, fail-closed      |
| Validation lifecycle semantics across adapters are well-defined for reusable plans | planner executability + lifecycle contracts together           | state remains global while validation is adapter-specific                                               | Unproven / under-specified  |
| Public planner contract changes stay within canonical owner model                  | ADR-0035                                                       | Slice consumes canonical `@dvt/contracts` types rather than inventing local planner contracts           | Compliant                   |

## 6. Evidence reviewed

### 6.1. Code surfaces

- [apps/api/src/entrypoints/http/startRunRoute.ts](../../../apps/api/src/entrypoints/http/startRunRoute.ts)
- [apps/api/src/application/services/PlannerBackedStartRunUseCase.ts](../../../apps/api/src/application/services/PlannerBackedStartRunUseCase.ts)
- [apps/api/src/application/services/StoredPlanExecutabilityValidator.ts](../../../apps/api/src/application/services/StoredPlanExecutabilityValidator.ts)
- [apps/api/src/application/services/StoredExecutablePlanResolver.ts](../../../apps/api/src/application/services/StoredExecutablePlanResolver.ts)
- [apps/api/src/modules/buildProtectedRuntimeModule.ts](../../../apps/api/src/modules/buildProtectedRuntimeModule.ts)
- [packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts](../../../packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts)
- [packages/@dvt/engine/src/adapters/mock/MockAdapter.ts](../../../packages/@dvt/engine/src/adapters/mock/MockAdapter.ts)
- [packages/@dvt/adapter-temporal/src/activities/stepActivities.ts](../../../packages/@dvt/adapter-temporal/src/activities/stepActivities.ts)

### 6.2. Tests executed locally during this review

Executed focused tests for the slice:

```text
apps/api/test/application/services/PlannerBackedStartRunUseCase.test.ts
apps/api/test/application/services/StoredExecutablePlanResolver.test.ts
apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts
apps/api/test/entrypoints/http/startRunRoute.test.ts
apps/api/test/integration/protectedRuntime.integration.test.ts
packages/@dvt/adapter-postgres/test/PostgresPlanStore.test.ts
packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts
```

Result observed through the test runner during the original review: **29 passed, 0 failed**.

Additional remediation tests added and executed in this pass:

```text
apps/api/test/application/services/StoredExecutablePlanResolver.test.ts
apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts
packages/@dvt/adapter-postgres/test/PostgresPlanStore.test.ts
```

Result observed through the test runner during remediation: **9 passed, 0 failed**.

## 7. Positive observations worth keeping

- The route does not smuggle planner-local semantics into the API; it delegates envelope validation to canonical contracts.
- The use case keeps planner, persistence, validation, and execution responsibilities separated.
- The store correctly persists both canonical and executable JSON forms, which is useful for audit and runtime retrieval.
- The protected runtime integration test is materially valuable because it exercises real OIDC + PostgreSQL rather than only mocks.

## 8. Required actions before this slice can be called specification-complete

1. Define whether validation state is adapter-scoped or globally reusable.
2. Define the canonical behavior for concurrent duplicate admissions of the same canonical plan.
3. Add end-to-end evidence for planner-backed execution on Temporal, or narrow the advertised support until that evidence exists.
4. Decide whether reusable `VALID` plans are an intended feature or an explicitly unsupported path.

## 9. Final QA verdict

This slice is **substantially stronger after remediation but still not fully specification-complete**.

If the bar is "does the implementation close the original blocking QA findings?" then the answer is largely yes.

If the bar is "does it now satisfy the stored-plan integrity and persisted-reference semantics for the covered path?" then the answer is yes.

If the bar is "does the contract now define reusable-plan behavior across adapters and under concurrency?" then the answer is still no.

The slice should therefore be treated as:

- **materially hardened on the covered mock path**,
- **still missing contract-level clarity on plan reuse and concurrent admission**,
- **still lacking Temporal end-to-end conformance evidence**.

## 10. New invariants identified during remediation

1. **Non-runnable return invariant for `storePlan()`**
   - `storePlan()` cannot safely return an already `VALID` or `INVALID` row without violating the lifecycle contract's "persist non-runnable ref before validation" meaning.

2. **Adapter-scoping invariant for validation results**
   - Because `validatePlan` is adapter-specific but persisted lifecycle state is global, reusable plan semantics are under-specified unless validation state is scoped by adapter or reuse is explicitly forbidden.

3. **Concurrent validation owner invariant**
   - If duplicate callers can attach to the same pending plan, the contract must define whether exactly one caller owns the transition to `VALID` or whether repeated equivalent `markValid` operations become idempotent.

4. **Runtime-proof invariant**
   - Admitting a scheme at the API boundary is stronger than parsing it. The repository still needs explicit end-to-end proof for every adapter the API claims can execute that scheme.
