---
title: RC-A2 QA Hard Review
status: Review
owner: QA / Architecture
last_reviewed: 2026-03-22
planning_type: review
---

# RC-A2 QA Hard Review

## Scope Reviewed

- `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`
- `packages/@dvt/engine/src/core/idempotency.ts`
- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/test/core/WorkflowEngine.intent-id-deterministic.test.ts`
- `docs/planning/state/execution-workboard.md`

## Findings (Ordered By Severity)

1. `MEDIUM` - Missing negative tests for the new deterministic ID API contract.
   - Reference: `packages/@dvt/engine/test/core/WorkflowEngine.intent-id-deterministic.test.ts:76`
   - Detail: tests only cover stable output for valid values. There is no negative coverage for malformed inputs (for example empty `tenantId`) or for boundary behavior around separator-sensitive values.
   - Risk: a public API was added (`startRunIntentId`) but behavior for invalid inputs is currently unspecified and untested.
   - Recommendation: add explicit negative tests and either:
     - enforce guardrails in `startRunIntentId`, or
     - document preconditions in contract comments and treat invalid inputs as caller error.

2. `LOW` - Exit criterion #3 from the RC-A2 proposal is not directly asserted in tests.
   - Reference: `packages/@dvt/engine/src/core/idempotency.ts:76`
   - Detail: proposal says “Existing event ID usage outside start-run intent path remains unaffected,” but new tests do not verify that `eventId()` remains UUID-based/random behavior outside start-run intent.
   - Risk: future refactors could inadvertently change `eventId()` semantics without test detection.
   - Recommendation: add one focused regression test asserting `eventId()` remains non-deterministic and still used by non-intent event paths.

## Invariant Assessment

- `INV-INTENT-011` intent determinism in start-run path: `PASS` at call-site level.
  - `WorkflowEngine` now derives intent ID from `(tenantId, runId)` before `createIntent`.
  - Reference: `packages/@dvt/engine/src/core/WorkflowEngine.ts:286`
- Deterministic builder behavior: `PASS` for happy path.
  - Reference: `packages/@dvt/engine/src/core/idempotency.ts:72`

## Negative Test Assessment

- Existing negative tests for RC-A2-specific API surface: `INSUFFICIENT`.
- Crash consistency and reconciliation negative coverage remains strong in existing suite, but not targeted to the new builder API.

## Validation Evidence (QA Run)

- `pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.intent-id-deterministic.test.ts test/idempotency.vectors.test.ts` -> `PASS` (escalated rerun after sandbox `spawn EPERM`).

## Incident Status

- `MEDIUM` (negative tests missing): `CLOSED`
  - Added negative/edge coverage in `packages/@dvt/engine/test/idempotency.vectors.test.ts`.
- `LOW` (eventId non-regression missing): `CLOSED`
  - Added explicit non-regression assertion for `eventId()` in `packages/@dvt/engine/test/idempotency.vectors.test.ts`.
