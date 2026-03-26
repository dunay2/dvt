---
title: 20260326 RunMaintenanceService SRP Review
status: Active
owner: Architecture / QA
last_reviewed: 2026-03-26
planning_type: review
---

# 20260326 RunMaintenanceService SRP Review

Scope reviewed:

- `packages/@dvt/engine/src/services/RunMaintenanceService.ts`

## Findings

1. High: mixed domain capabilities in one service
   - `detectStuckRuns`/`detectStuckCancellingRuns` and `reconcileOrphanedIntents` carry different reasons to change.
   - References:
     - `RunMaintenanceService.ts:64`
     - `RunMaintenanceService.ts:191`

2. High: orchestration, telemetry, and technical event envelope construction are coupled
   - Domain policy decisions, event persistence, metrics/logging, and event envelope building are all implemented in one class.
   - References:
     - `RunMaintenanceService.ts:94`
     - `RunMaintenanceService.ts:98`
     - `RunMaintenanceService.ts:409`

3. Medium: domain literals and operational messages are inline
   - `RunFailed` reasons and maintenance messages are hardcoded instead of centralized in domain constants.
   - References:
     - `RunMaintenanceService.ts:95`
     - `RunMaintenanceService.ts:161`
     - `RunMaintenanceService.ts:386`

4. Medium: pending-intent reconciliation method has multiple responsibilities
   - `reconcilePendingOrphanedIntent` combines policy branching, adapter capability checks, provider cancellation, intent transitions, and telemetry.
   - Reference:
     - `RunMaintenanceService.ts:237`

## Recommendation

1. Extract `StuckRunFailureService` for stuck-run transitions.
2. Extract `OrphanedIntentReconciliationService` for ADR-0030 reconciliation policy.
3. Create `RunMaintenanceDomainConstants` for run-failure reasons and maintenance log messages.
4. Extract `RunMaintenanceEventFactory` for technical event envelope construction.

## SRP Verdict

Current implementation is functional but does not satisfy strict SRP boundaries.

## QA Prioritization (Expanded)

### P1

1. Observability side effects can break maintenance execution
   - Metrics/log calls are not fail-soft; if a sink throws, the sweep can fail mid-loop and leave partial transitions.
   - References:
     - `RunMaintenanceService.ts:98`
     - `RunMaintenanceService.ts:105`
     - `RunMaintenanceService.ts:251`
     - `RunMaintenanceService.ts:306`
   - Test gap:
     - Existing fixtures only use `createNoopObservability` and do not assert throw-path resilience.
     - `RunMaintenanceService.test.ts:101`
     - `RunMaintenanceService.intentReconciliation.test.ts:144`

2. Weak type boundary for `RunFailed` payload reason
   - `buildRunEvent` accepts `payload?: Record<string, unknown>`, so reason literals are not compile-time constrained to canonical failure reasons.
   - References:
     - `RunMaintenanceService.ts:95`
     - `RunMaintenanceService.ts:161`
     - `RunMaintenanceService.ts:412`

### P2

3. Infinite unresolved path for adapters without `lookupRunRef`
   - PENDING intents stay unresolved forever when provider lookup is unsupported/throws; this is intentional but operationally risky without explicit escalation policy.
   - References:
     - `RunMaintenanceService.ts:250`
     - `RunMaintenanceService.ts:269`
   - Current behavior is covered, but no guardrail for backlog growth.

4. Domain constants drift risk
   - Maintenance reasons/messages remain inline and can diverge from the canonical contract vocabulary.
   - References:
     - `RunMaintenanceService.ts:95`
     - `RunMaintenanceService.ts:161`
     - `RunMaintenanceService.ts:172`
     - `RunMaintenanceService.ts:386`

### P3

5. Test suite overlap increases maintenance cost
   - `RunMaintenanceService.test.ts` and `RunMaintenanceService.intentReconciliation.test.ts` duplicate several reconciliation scenarios with near-identical fixtures.
   - References:
     - `RunMaintenanceService.test.ts:469`
     - `RunMaintenanceService.intentReconciliation.test.ts:150`

## Recommended Execution Order

1. Harden observability calls to fail-soft (P1).
2. Type `RunFailed` payloads with a strict reason union and centralize literals (P1/P2).
3. Define explicit policy for unresolved PENDING intents without lookup support (P2).
4. Split service responsibilities and deduplicate test fixtures after behavior is stabilized (P2/P3).
