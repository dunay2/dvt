---
title: 20260326 S03 Hard QA Review
status: Active
owner: Architecture / QA
last_reviewed: 2026-03-26
planning_type: review
---

# 20260326 S03 Hard QA Review

Scope reviewed:

- `packages/@dvt/engine/src/services/StartRunCoordinator.ts`
- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/test/core/WorkflowEngine.observability.test.ts`

## Findings

1. Security ordering risk (resolved in this pass)
   - `assertTenantAccess` had to run before `validatePlanRef` in start-run preconditions
   - reason: avoid plan-uri validation leakage to unauthorized callers

2. Error masking risk in failure path (resolved in this pass)
   - observability emission in `handleStartRunError` must be fail-soft
   - reason: telemetry failure must never replace domain failure

3. Coordinator remains large (open)
   - `StartRunCoordinator` still mixes orchestration, mapping, and policy details
   - follow-up: split into smaller collaborators without behavior drift

4. Service-level seam tests (partially addressed)
   - added explicit security-ordering regression coverage
   - follow-up: add direct `StartRunCoordinator` unit suite

## Actions executed

- Reordered precondition checks to authorize first.
- Hardened error-path observability calls with fail-soft guards.
- Added regression test for unauthorized start-run with invalid plan URI.
