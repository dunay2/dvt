---
id: R-20260321-PLANNER-LIFECYCLE-01
title: Planner validation lifecycle semantics remain under-specified across adapters and duplicate admission contention
status: Open
date: 2026-03-21
owners:
  - planner
  - contracts
  - api
  - adapters
severity: Medium
probability: Medium
---

# R-20260321-PLANNER-LIFECYCLE-01 - Planner validation lifecycle semantics remain under-specified across adapters and duplicate admission contention

## Context

The planner-backed `startRun` remediation closed concrete correctness defects in
stored-plan integrity, collision handling, capability validation, and runtime
Temporal evidence.

That work also made the remaining debt sharper:

- executability validation is adapter-specific,
- lifecycle persistence is still one global state per plan,
- duplicate admissions now have executable evidence for the current behavior,
- protected API support for Temporal still lacks a single end-to-end proof lane.

## Risk

If the repository keeps the current implementation without clarifying the
contract semantics, future changes can drift in at least three ways:

- a caller may assume `VALID` means valid for every adapter when the validation
  gate actually depends on `adapterId`;
- a second admission path may treat `PLAN_VALIDATION_STATE_INVALID_TRANSITION`
  as an incidental storage error instead of a governed contention outcome;
- product and documentation surfaces may overstate planner-backed Temporal
  support before the protected API lane is proven in one executable test.

## Current Observed Behavior

The repository now has executable evidence for the current implementation:

- duplicate `storePlan()` calls for the same canonical plan may return the same
  pending `PlanRef`,
- only one caller can transition that row to `VALID`,
- the second caller receives `PLAN_VALIDATION_STATE_INVALID_TRANSITION`,
- Temporal runtime can execute a planner-backed `dvt-plan://postgres/...` ref,
  but the protected API lane is still not proven end to end.

## Mitigation

- Evolve the planner lifecycle contract to state whether validity is global or
  adapter-scoped.
- Decide whether duplicate-admission contention is intended single-winner
  behavior, retriable contention, or a signal for higher-level coordination.
- Add a protected API integration lane for `targetAdapter: 'temporal'` with real
  OIDC, PostgreSQL persistence, validation, and Temporal dispatch.
- Keep QA review and evidence docs aligned until those semantics are canonized.

## Evidence

- `docs/planning/reviews/execution-runtime/20260321-planner-backed-start-run-qa-review.md`
- `docs/evidence/context/ED-20260321-planner-start-run-qa-rationale.md`
- `packages/@dvt/adapter-postgres/test/PostgresPlanStore.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts`
