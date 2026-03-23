---
title: 20260322 RC-A5 QA Hard Review
status: Review
owner: QA / Architecture
last_reviewed: 2026-03-22
planning_type: review
---

# RC-A5 QA Hard Review

Scope reviewed:

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/test/core/WorkflowEngine.test.ts`
- task tracking updates in `docs/planning/state/*`

Reviewed against:

- ADR-0030 invariants (`INV-INTENT-003`, `INV-INTENT-004`)
- RC-A5 objective in execution workboard / open-task-route
- Negative-path observability behavior

## Findings (ordered by severity)

1. Medium: best-effort contract can still leak failures if telemetry throws
   - Location: `packages/@dvt/engine/src/core/WorkflowEngine.ts` around `markIntentResolvedBestEffort` (lines with `counter(...).add(1)` and `logs.warn(...)`).
   - Why: the method catches `intentStore.markResolved` errors, but telemetry side effects are not guarded. If observability backend throws at runtime, `startRun` could fail even though intent resolution is explicitly best-effort by ADR-0030 (`INV-INTENT-004`).
   - Impact: potential regression from "cleanup failure is non-fatal" to "cleanup failure becomes fatal under telemetry fault".
   - Recommendation:
     - Wrap metric/log emission in an inner `try/catch` that never rethrows.
     - Keep the outer semantic: `markResolved` failure never aborts the run lifecycle.

2. Low: negative tests do not cover all RC-A5 failure call sites
   - Location:
     - `packages/@dvt/engine/src/core/WorkflowEngine.ts` call sites at the three `markIntentResolvedBestEffort(...)` invocations.
     - `packages/@dvt/engine/test/core/WorkflowEngine.test.ts` only one explicit test: `emits warning and metric when markResolved fails after dispatch`.
   - Why: only pre-bootstrap/dispatch path is asserted. Legacy bootstrap success and compensation path are not explicitly asserting warning/metric emission.
   - Impact: regression risk in two untested paths where RC-A5 behavior is now centralized.
   - Recommendation:
     - Add two negative tests:
       1. legacy path: `bootstrapRunTx` succeeds, `markResolved` fails -> run succeeds + warning/metric emitted.
       2. compensation path: `bootstrapRunTx` fails and `markResolved` fails -> original bootstrap failure preserved + warning/metric emitted.

## Invariant Check

- `INV-INTENT-003` (markResolved after successful bootstrap): still satisfied.
- `INV-INTENT-004` (best-effort markResolved on compensation path): behavior intent is satisfied, but telemetry-throw escape hatch (Finding 1) should be closed to make this invariant robust under observability faults.

## QA Verdict

- Functional direction of RC-A5 is correct and improves observability.
- Not ready for "fully hardened" closeout until Finding 1 is addressed and negative coverage is extended for all call sites.

## Resolution Update (2026-03-22)

- Finding 1 resolved:
  - `markIntentResolvedBestEffort(...)` now wraps telemetry emission (`counter.add`, `logs.warn`) in inner `try/catch` and preserves ADR-0030 best-effort behavior under observability backend failures.
  - When both observability sinks fail, the engine now emits a throttled fallback signal to `stderr` as last-resort diagnostics, while keeping the path non-fatal.
- Finding 2 resolved:
  - Negative-path tests now cover all RC-A5 call sites:
    - pre-bootstrap dispatch path
    - legacy bootstrap-success path
    - compensation path with preserved bootstrap error
    - telemetry-backend-failure while reporting `markResolved` failure
    - metrics counter-construction failure with warning still emitted
    - warning-sink failure with metric path preserved
    - both telemetry sinks failing while `startRun` remains non-fatal
    - fallback `stderr` emission when both sinks fail
    - fallback throttle behavior under repeated failures
    - fallback safety when `stderr.write` itself throws

## Evidence

- Validation command: `pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.test.ts` (pass, 42 tests)
- Validation command: `pnpm verify:prepush` (pass)

## Updated Verdict

- ACCEPT WITH CONDITIONS SATISFIED (ready for merge review).
