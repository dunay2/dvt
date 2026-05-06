---
title: Closeout - AR-C4 run-state circuit breaker
status: Done
owner: Runtime / Adapters / Docs
last_reviewed: 2026-05-06
planning_type: closeout
slice: AR-C4-run-state-circuit-breaker
---

# Closeout: AR-C4 run-state circuit breaker

## Think-First Analysis

### Problem summary

Temporal activities were writing to run-state storage through a direct command
port bridge with no resilience control. When PostgreSQL degraded, activity
writes could block until external timeouts, amplifying workflow latency and
masking clear degradation posture.

### Root cause

The activity write seam had no local failure budget, no open-circuit fast-fail
path, and no worker metrics exposing circuit posture. The system depended on
timeout-only behavior.

### Governing constraints

- ADR-0003: execution lifecycle authority remains DVT-owned.
- ADR-0004: event persistence remains append-oriented and deterministic.
- Lane C AR-C4 objective: fail fast with retryable activity errors and expose
  circuit state via metrics.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - add a circuit-breaker wrapper around `RunStateCommandPort`
  - inject wrapper in temporal-worker runtime composition
  - expose breaker state and counters through worker operational metrics
  - add unit tests for breaker behavior and worker metrics wiring
- Out of scope:
  - admission backpressure from worker saturation (`AR-C3`)
  - engine-adapter call-level breaker (`AR-C5`)

## Implementation Summary

- Added `CircuitBreakingRunStateCommandPort` in
  `packages/@dvt/adapter-temporal/src/RunStateCommandPortCircuitBreaker.ts`.
- Wrapped `PostgresRunStateCommandPortBridge` with the new breaker in
  `apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts`.
- Added worker env controls for breaker threshold, open duration, and operation
  timeout in `apps/temporal-worker/src/plugins/env.ts`.
- Extended `TemporalWorkerMonitor` and operational endpoints to surface breaker
  state and counters in `/metrics`, `/healthz`, and `/readyz`.
- Added focused tests for breaker transitions/timeouts and worker observability
  integration.

## Validation Run

- `pnpm --filter @dvt/adapter-temporal test`
- `pnpm --filter dvt-temporal-worker test`
- `pnpm --filter dvt-temporal-worker typecheck`
- `pnpm --filter @dvt/adapter-temporal build`
- `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No stubs, placeholders, or fake success paths were introduced.
- No lint/type/test rules were disabled.
- No hooks/checks were bypassed.
- No undocumented temporary bypasses were added.

## 2026-05-06 Review Acceptance

Lane C review reconciliation accepted this closeout as closure evidence for
`AR-C4`. The code and test evidence referenced by the lane still exists, and no
separate blocker remains for the activity-to-state-store circuit breaker slice.
