---
title: ED-20260321 - Planner-backed startRun QA rationale and discoveries
status: accepted
date: 2026-03-21
owners: Engineering
arc_level: ARC-1
breaking: false
evidence_class: context
code_refs:
  - apps/api/src/application/services/StoredExecutablePlanResolver.ts
  - apps/api/src/application/services/StoredPlanExecutabilityValidator.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts
  - packages/@dvt/adapter-postgres/test/PostgresPlanStore.test.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
  - docs/planning/reviews/20260321-planner-backed-start-run-qa-review.md
  - docs/risk-register/quality/R-20260321-planner-validation-lifecycle-semantics.md
evidence:
  tests: []
  notes:
    - Stored-plan integrity is now enforced on the mock execution lane before parsing.
    - Stored-plan capability validation now fails closed when adapters omit capability declaration.
    - storePlan now proves persisted equivalence, rejects collisions, and rejects validated-row reuse.
    - Temporal runtime now has direct evidence for planner-backed dvt-plan://postgres plan execution.
    - Duplicate pending admissions are evidenced as single-winner and fail-closed, but not yet normatively specified.
---

# ED-20260321 - Planner-backed startRun QA rationale and discoveries

## Purpose

This evidence doc records the rationale for the QA remediation sequence around
planner-backed `startRun`, the discoveries made while hardening the slice, and
the explicit boundaries of what was intentionally not changed.

The repository already has a QA review in
`docs/planning/reviews/20260321-planner-backed-start-run-qa-review.md`.
That review captures compliance status and remaining gaps. This document is the
companion rationale record: why the remediation was scoped the way it was and
what engineering conclusions were preserved as repository truth.

## What We Did

### 1. Hardened stored-plan integrity on the mock execution lane

We updated the stored executable plan resolver so that planner-backed
`dvt-plan://` refs are no longer treated as trusted parsed payloads.

The resolver now:

- fetches the stored bytes,
- verifies `sha256(bytes) == planRef.sha256`,
- parses the executable plan only after integrity verification,
- rejects metadata drift between the parsed payload and the `PlanRef`.

Rationale:

- ADR-0012 makes byte-integrity verification an execution-side obligation.
- The Temporal path already had that shape.
- Leaving the mock path weaker would preserve an execution-authority split by
  adapter, which is exactly the kind of drift ADR-0012 exists to prevent.

### 2. Closed fail-open capability validation

We updated executability validation so that plans requiring capabilities are
rejected when the selected adapter does not declare a capability surface.

Rationale:

- an omitted capability surface is not evidence of support,
- accepting capability-bound plans without an adapter declaration weakens the
  pre-start executability gate,
- the correct failure mode for a Stage 1.1 validated-start path is fail-closed.

### 3. Hardened `storePlan()` around persisted identity and lifecycle reuse

We changed `PostgresPlanStore.storePlan()` so that it now:

- reads the persisted row back on conflict,
- proves equivalence between request and persisted row,
- throws `PLAN_STORE_CONFLICT` when persisted content differs,
- throws `PLAN_VALIDATION_STATE_REUSE_UNSUPPORTED` when the existing row is
  already `VALID` or `INVALID`.

Rationale:

- `storePlan()` is contractually the entry into a non-runnable lifecycle,
- returning a ref to an already validated row would silently invent lifecycle
  semantics the contract does not define,
- collision tolerance is only safe when the persisted row is demonstrably the
  same plan and still in `PENDING_VALIDATION`.

### 4. Added evidence for the Temporal runtime lane

We added a Temporal time-skipping integration test that starts a run from a
planner-backed `dvt-plan://postgres/...` ref and proves that the runtime fetch
path consumes that stored-plan reference.

Rationale:

- the protected runtime module already advertises `dvt-plan` as an allowed
  execution scheme,
- the QA review could not keep treating Temporal support as purely inferred once
  a direct runtime test was available,
- closing the pure-runtime evidence gap narrows the remaining debt to the
  protected API lane rather than the Temporal adapter itself.

### 5. Added evidence for duplicate-admission contention behavior

We added a Postgres plan-store test proving the currently implemented behavior
for identical duplicate admissions of the same canonical plan:

- both callers may obtain the same pending `PlanRef`,
- only one caller can transition that row to `VALID`,
- the second caller receives `PLAN_VALIDATION_STATE_INVALID_TRANSITION`.

Rationale:

- this behavior was already implied by the lifecycle implementation,
- the QA gap was not just about code but about missing executable proof,
- it is better to record the current behavior precisely than to leave it as an
  untested concurrency assumption.

## What We Deliberately Did Not Do

### 1. We did not redefine lifecycle state as adapter-scoped

We did not change `PlanValidationLifecycle.v1` or introduce adapter-specific
validity rows.

Reason:

- that is a contract and model decision, not a local bug fix,
- changing it cleanly would require canonical contract evolution and migration
  semantics,
- patching storage or API behavior locally would create hidden architectural
  debt.

### 2. We did not make validated plans implicitly reusable

We did not treat a second `storePlan()` for an already `VALID` plan as a normal
or idempotent success path.

Reason:

- the current contract says `storePlan()` returns a non-runnable ref,
- silently reusing validated rows would conflate admission and reuse semantics,
- there is not yet a canonical answer to whether reuse is global, per adapter,
  or explicitly unsupported.

### 3. We did not claim the protected API Temporal lane is closed

We did not update the review to say planner-backed Temporal execution is fully
specification-complete.

Reason:

- the new proof is runtime-level inside the Temporal adapter,
- the protected API lane still lacks one live test covering admission,
  persistence, validation, and Temporal dispatch together,
- overstating closure would turn evidence into marketing rather than governance.

## Discoveries Worth Keeping

1. The strongest remaining gap is no longer execution integrity but lifecycle
   semantics.
2. The repository currently behaves as single-winner under duplicate validation
   contention.
3. That single-winner behavior is implementation truth, not yet normative
   contract truth.
4. Temporal runtime support for stored-plan refs is now evidenced directly.
5. The remaining Temporal gap is at the protected API lane, not in the adapter's
   fetch-and-validate path.

## Debt Preserved As Open Risk

The unresolved debt is intentionally tracked outside this evidence doc in:

- `docs/risk-register/quality/R-20260321-planner-validation-lifecycle-semantics.md`

That risk captures the open contract questions we did not patch locally:

- whether validity is global or adapter-scoped,
- whether duplicate validation contention is the intended semantic,
- whether protected-runtime Temporal support must be proven before the public
  claim is considered fully closed.

## Validation Evidence

Executed during the remediation and follow-up documentation pass:

```text
pnpm --filter dvt-api test
  passed

pnpm test:adapter-postgres
  passed

pnpm --filter dvt-api test:integration
  passed in the configured environment

pnpm test:adapter-temporal
  passed with the new planner-backed stored-plan runtime proof

pnpm docs:sync
  passed

pnpm verify:prepush
  passed
```

## No-Debt / No-Stub Statement

No stub, placeholder, fake success path, or hidden rule downgrade was added in
this remediation sequence.

The remaining open items are preserved explicitly as risk and review findings,
not buried in code as silent behavior.
