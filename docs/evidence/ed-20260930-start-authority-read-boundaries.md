---
title: Start authority read boundaries and concern isolation
status: Draft
date: 2026-09-30
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/services/startRun/readStartRunAuthority.ts
  - packages/@dvt/engine/src/services/startRun/StartRunFailurePolicy.ts
  - packages/@dvt/engine/src/services/startRun/StartRunFailureDiagnostics.ts
  - packages/@dvt/engine/src/services/startRun/StartRunCompensation.ts
  - packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts
  - packages/@dvt/engine/src/services/runMaintenance/DispatchedIntentReconciliationPolicy.ts
  - packages/@dvt/engine/src/services/runMaintenance/PendingIntentReconciliationPolicy.ts
  - packages/@dvt/engine/src/services/runMaintenance/decidePendingIntentReconciliation.ts
  - packages/@dvt/engine/src/services/runMaintenance/PendingIntentReconciliationEffects.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine exec vitest run --coverage
    - pnpm --filter @dvt/engine exec tsc --noEmit -p tsconfig.json
    - pnpm arch:deps
    - pnpm lint:determinism
---

# Start Authority Read Boundaries And Concern Isolation

## Governed Claim

ADR-0030 and StartRunProtocol.v1 govern the existing start and maintenance rails.
The [governing issue](https://github.com/dunay2/dvt/issues/2679) records the
[pre-implementation plan](https://github.com/dunay2/dvt/issues/2679#issuecomment-5911282619),
[diagnostic refinement](https://github.com/dunay2/dvt/issues/2679#issuecomment-5911543242)
and [approved concern separation](https://github.com/dunay2/dvt/issues/2679#issuecomment-5911612933).
Planning DB contains the corresponding design/scope and mechanization records.

An authority read has distinct found, missing and failed outcomes. A failed
DISPATCHED metadata read cannot cause provider cancellation or intent resolution.
A failed/missing metadata or intent read cannot authorize RunFailed; the start
error is preserved. Diagnostics cannot change either decision.

## Change Isolation

| Owner                              | Responsibility                              | Excluded dependencies                     |
| ---------------------------------- | ------------------------------------------- | ----------------------------------------- |
| StartRunFailurePolicy              | Guarded failure-write orchestration         | Diagnostic transport and throttle state   |
| StartRunFailureDiagnostics         | Failure messages, metrics, bounded fallback | Run/intent stores and provider adapters   |
| StartRunExecutionService           | Dispatch/bootstrap/reference sequencing     | Direct cancellation                       |
| StartRunCompensation               | Existing cancel then cleanup sequence       | Authority decisions                       |
| PendingIntentReconciliationPolicy  | Ordered observations and orchestration      | Direct mutations and diagnostic transport |
| decidePendingIntentReconciliation  | Pure transition decision                    | Runtime imports, provider/storage I/O     |
| PendingIntentReconciliationEffects | Apply the selected transition               | Re-reading decision evidence              |

Composition remains internal to existing rails. No public DTO, new endpoint,
compatibility alias, generic framework or v2 was introduced. The small
RunMaintenanceService facade was not split further.

## Executable Evidence

Before the fix, eight negative tests failed: failed DISPATCHED metadata reads
caused cancellation; failed/missing intent reads could emit false RunFailed.
One metadata-read case already preserved state but lacked the bounded diagnostic.
Tests preserve complete metadata, ordered events, snapshots and intent contents;
non-Error rejection and throwing diagnostic sinks are covered.

Before diagnostic cleanup, two tests exposed inline metric identities and the
stale stderr component name. Metric wire values and exception identity remain
unchanged. Before extraction, architecture guards failed on failure-policy
diagnostic transport and start-service cancellation. Those guards now enforce
the isolated boundaries above.

The decision table covers failed/unsupported observations, found/missing
provider state and every current canonical run status. Existing service tests
exercise the real Engine and maintenance orchestration. Compensation tests
characterize exact provider reference, cancellation-before-cleanup ordering and
throwing diagnostic sinks; they do not certify cancellation confirmation.

The hook-normalized full Engine suite passed: 71 files, 527 tests. Engine
typecheck, architecture dependency checks, determinism lint and the canonical
contract fixture validator also passed. Final prepush, exact base/head
mechanization and integration state are recorded in the governing issue and
implementation PR. The contract validator reports a missing glossary source;
its 25 fixture checks pass, but that routed omission is not glossary validation.

## Explicit Limits

This cut does not establish exclusive ownership or cross-resource fencing
([#2678](https://github.com/dunay2/dvt/issues/2678)). Durable unknown outcomes,
late RPCs, cancellation confirmation and bounded retry/escalation remain under
#2679. The refactor preserves those current protocol semantics; extracting an
effect is not evidence that the effect is safe under concurrency.

No PostgreSQL/Temporal concurrency proof is claimed. No shared application
database was changed. No new debt entry, stub, fake implementation, bypass,
disabled hook or relaxed validation rule was introduced.
