---
id: R-20260326-ENGINE-RUN-MAINTENANCE-01
title: RunMaintenance refactor can drift in observability and dry-run operator semantics
status: Open
date: 2026-03-26
owners:
  - engine
  - runtime
  - ops
severity: Medium
probability: Low
---

# R-20260326-ENGINE-RUN-MAINTENANCE-01 - RunMaintenance refactor can drift in observability and dry-run operator semantics

## Context

`RunMaintenanceService` was split into focused services and policies to align
with SRP/DDD boundaries (`RunMaintenanceStuckRunService`,
`RunMaintenanceOrphanedIntentService`, per-status reconciliation policies, and
`RunMaintenanceObservabilityFacade`).

The slice also introduced explicit `deferred` output for orphaned-intent
reconciliation and dry-run reporting.

## Risk

Even after the refactor, residual risk remains:

- observability behavior can diverge between maintenance services if new sinks
  or telemetry rules are added in only one code path;
- operators can misread dry-run output semantics if deferred-only outcomes are
  not documented and validated over time;
- future edits can reintroduce local literals/counters and bypass the canonical
  maintenance constants/facade.

## Implemented Mitigations

- centralized maintenance domain literals/metrics in
  `RunMaintenanceDomainConstants`;
- centralized fail-soft metrics/logging in `RunMaintenanceObservabilityFacade`;
- coordinator warns and increments metric on unexpected intent statuses;
- dry-run behavior now reports inspected intents as `deferred` explicitly;
- regression tests assert unexpected-status signaling and deferred semantics.

## Remaining Actions

1. Keep `RunMaintenanceStuckRunService` and orphaned-intent policies aligned on
   the same observability facade when new telemetry sinks are added.
2. Preserve explicit dry-run semantics in contracts/docs when maintenance
   outputs evolve.
3. Track coverage and fixture coupling as the canonical maintenance test suite
   grows.

## Evidence

- `packages/@dvt/engine/src/services/RunMaintenanceService.ts`
- `packages/@dvt/engine/src/services/runMaintenance/RunMaintenanceOrphanedIntentService.ts`
- `packages/@dvt/engine/src/services/runMaintenance/RunMaintenanceStuckRunService.ts`
- `packages/@dvt/engine/src/services/runMaintenance/RunMaintenanceObservabilityFacade.ts`
- `packages/@dvt/engine/test/services/RunMaintenanceService.test.ts`
- `docs/planning/reviews/execution-runtime/20260326-run-maintenance-service-srp-review.md`
