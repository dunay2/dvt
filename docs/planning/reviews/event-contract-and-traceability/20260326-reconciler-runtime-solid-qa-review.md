---
title: Reconciler Runtime SOLID QA Review
status: Draft
owner: API / Runtime / QA
last_reviewed: 2026-04-17
planning_type: review
---

# Reconciler Runtime SOLID QA Review

## Priority 1 (High) - Closed

### Finding (original)

`server.ts` used free-text logging during shutdown and broke the consistency of
structured runtime events.

### Evidence (historical)

- `apps/api/src/server.ts`
  - `app.log.error({ err }, 'intent reconciler shutdown failed')`

### Risk (historical)

Inconsistent observability, weaker filtering and alerting, and drift from the
runtime event catalog.

### Recommendation (applied)

Convert shutdown failure logging into a structured runtime event and reuse the
runtime event catalog.

### Current status

Resolved: `server.ts` now emits a structured shutdown failure event through
`RECONCILER_RUNTIME_EVENTS.shutdownFailed` with no free-text fallback.

## Priority 2 (Medium) - Closed

### Finding (original)

`startReconcilerHealthWatchdog` did not validate `staleMs` or `pollMs`.

### Evidence (historical)

- `apps/api/src/runtime/reconcilerHealthWatchdog.ts`
  - direct use of `config.staleMs` and `config.pollMs` with no guards

### Risk (historical)

Invalid values such as `<= 0`, `NaN`, or `Infinity` could cause pathological
polling or inconsistent degradation behavior.

### Recommendation (applied)

Add defensive config validation at startup and fail fast with an explicit error.

### Current status

Resolved: `startReconcilerHealthWatchdog` validates `staleMs` and `pollMs` as
positive finite numbers and fails fast when the values are invalid.

## Priority 3 (Medium) - Closed

### Finding (original)

`reconcilerRuntimeBootstrap.ts` concentrated too many responsibilities:
bootstrap orchestration, health-hook mapping, and initial lifecycle
transitions.

### Evidence (historical)

- `apps/api/src/runtime/reconcilerRuntimeBootstrap.ts`
  - `buildReconcilerHealthHooks`
  - `withWatchdogSweepSignalHooks`
  - `bootstrapIntentReconciler`

### Risk (historical)

Higher change cost and weaker isolation between domain decisions and
infrastructure adapters.

### Recommendation (applied)

Extract the health-hook factory and bootstrap orchestrator into dedicated
modules to satisfy strict SRP boundaries.

### Current status

Resolved: bootstrap is now split into dedicated modules:

- `reconcilerRuntimeHealthHooks.ts` for hooks
- `reconcilerRuntimeLifecycle.ts` for lifecycle orchestration
- `reconcilerRuntimeBootstrap.ts` as the export facade

## Priority 4 (High) - Closed

### Finding (original)

Dependency inversion was broken in the health layer:
`healthContract.ts` depended on `healthPresenter.ts` to build the HTTP schema.

### Evidence (historical)

- `apps/api/src/routes/healthContract.ts`
  - imported `OVERALL_HEALTH_STATUS_VALUES`, `READINESS_STATUS`, and
    `READINESS_REASON_CODE_VALUES` from `healthPresenter.ts`

### Risk (historical)

The contract and presenter were coupled, so schema evolution depended on the
mapping implementation.

### Recommendation (applied)

Extract contract values into a pure contract module and make the presenter
depend on the contract, not the other way around.

### Current status

Resolved: `healthContract.ts` no longer imports `healthPresenter.ts`; the
contract is independent and the presenter now depends on the contract.

## Priority 5 (Medium) - Closed

### Finding (original)

`/readyz` improved to `200/503`, but readiness still depended only on the
reconciler status and not on real operational dependencies.

### Evidence (historical)

- `apps/api/src/routes/health.ts`
  - the handler used `evaluateReadiness(opts.getIntentReconcilerHealth())`
- `apps/api/src/routes/healthPresenter.ts`
  - `evaluateReadiness` only evaluated reconciler states

### Risk (historical)

False-positive readiness remained possible when DB or other critical runtime
dependencies failed while the reconciler was not `starting` or `degraded`.

### Recommendation (applied)

Add real readiness checks by port and integrate them into `/readyz`.

### Current status

Resolved: `/readyz` now evaluates readiness through real ports
(reconciler state, DB, and runtime adapters) via dedicated readiness modules.

## Priority 6 (Low) - Closed

### Finding (original)

`buildReadyzPayload` became unused after the readiness redesign.

### Evidence (historical)

- `apps/api/src/routes/healthPresenter.ts`
  - exported function no longer referenced by `health.ts`

### Risk (historical)

Accidental noise and minor maintenance debt.

### Recommendation (applied)

Delete the dead function and keep the module free of orphan exports.

### Current status

Resolved: `buildReadyzPayload` was removed and there are no active references.

## H0 Reconciliation - Real baseline for the health slice

Items that reappeared in `LOCAL_EXECUTION_LOG_20260401.md` as open
health/readiness work had already been delivered in code and must not be
reintroduced into the implementation backlog.

### Verified current status

- `apps/api/src/routes/healthContractMapper.ts`
  - already exists as the explicit `runtime -> contract` translator
- `apps/api/src/routes/healthPresenter.ts`
  - is already a minimal facade that re-exports the mapper
- `apps/api/src/runtime/reconcilerHealth.ts`
  - already models `ReconcilerHealthState` as a discriminated union and keeps
    `reasonCode` only on `status: 'degraded'`

### Operational decision

1. Do not reopen "create mapper," "create discriminated union," or
   "clean up presenter" as implementation work.
2. Keep that work closed and use `apps/api` tests as the validation baseline.
3. Keep the remaining open work focused on `RC-G1` contract ownership.

## Priority 7 (High) - Open

### Finding

Contract ownership debt remains: the `engine/planner/shared` taxonomy still
does not map clearly onto the physical contract boundary and can drift into
accidental concentration in `shared`.

### Evidence

- `docs/contracts/engine/index.md`
- `docs/contracts/planner/index.md`
- `docs/contracts/shared/index.md`
- `packages/@dvt/contracts/src/contracts/planner/*`
- `packages/@dvt/contracts/src/engine/*`
- `docs/planning/proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md`
- operational tracking in `docs/planning/state/agent-lane-a.yaml` as `RC-G1`

### Risk

- ambiguous semantic vs physical ownership
- rule and literal drift between runtime and contracts
- less auditable evolution by bounded context

### Recommendation

Execute `RC-G1`: establish an ownership matrix by family
(`engine` / `planner` / `shared`) and migrate by slice under
ADR-0041 Contract-First.

### Current status

Pending, but already reconciled with the canonical planning surface:

- `RC-G1` lives in Lane A as the umbrella task
- `RC-G1-A` freezes the ownership matrix
- `RC-G1-B`, `RC-G1-C`, and `RC-G1-D` sequence the remaining migration

## Executive Summary

The runtime closed the prioritized health/readiness and bootstrap findings
through cleaner modular separation, defensive validation, and an independent
contract boundary. The only real open work left in this slice is contract
ownership under `RC-G1`.
