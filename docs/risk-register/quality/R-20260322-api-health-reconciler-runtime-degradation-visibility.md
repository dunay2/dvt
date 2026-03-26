---
id: R-20260322-API-HEALTH-01
title: API health can report healthy status when the reconciler fails after startup
status: Open
date: 2026-03-22
owners:
  - api
  - runtime
  - ops
severity: Medium
probability: Medium
---

# R-20260322-API-HEALTH-01 - API health can report healthy status when the reconciler fails after startup

## Context

Workstream `RC-D1` added intent-reconciler status to `/healthz`, and now
reports degraded status both for failed bootstrap and runtime sweep failure.

## Residual Risk

Although `/healthz` now transitions `healthy/degraded` with runtime signal,
residual risk remains: degradation scenarios that do not trigger a sweep callback
(for example, silent blocking or stalling) may not be visible immediately.

## Impact

- possible partial false negatives in platform health checks;
- delayed detection of failures not covered by current callbacks;
- risk of intent accumulation in stalling scenarios.

## Implemented Mitigations

- `/healthz` exposes per-component status (`intentReconciler`);
- bootstrap degradation reported with `reasonCode: bootstrap_failed`;
- runtime degradation reported with `reasonCode: runtime_unavailable`;
- runtime stalling watchdog integrated with health polling and sweep markers;
- public payload sanitized (no `err.message`);
- contract tests cover `disabled`, `starting`, `degraded`, no exposure of
  `reason`, and `reasonCode` fallback;
- integration test covers stalling degradation and recovery via
  `markSweepSignal` (`apps/api/test/server.test.ts`).

## Recommended Additional Remediation

1. Add a dedicated metric for reconciler runtime availability.
2. Add timeout/heartbeat detection for stalling without exceptions.
3. Add an integration test for controlled `healthy -> degraded` transition
   with real runtime behavior.

## Evidence

- `apps/api/src/routes/health.ts`
- `apps/api/src/server.ts`
- `apps/api/src/runtime/intentReconcilerRuntime.ts`
- `apps/api/test/app.test.ts`
- `docs/planning/qa-architecture-findings-and-risks.md`

## Update 2026-03-25

Additional error-governance controls were added in engine to reduce semantic
drift risk in operational error signaling:

- typed `code -> messageKey -> messageParams` contract in engine errors;
- removal of hardcoded human-readable text from error constructors;
- dedicated i18n contract tests (`errorI18n.contract.test.ts`) to prevent
  silent regressions.

Effect on this risk: improves traceability and consistency of observable error
signals, but does not change the reconciler runtime residual-risk status.
