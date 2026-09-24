---
title: AR-C4 runtime circuit breaker and Temporal integration hardening
status: Accepted
date: 2026-04-15
owners:
  - apps/temporal-worker
  - packages/@dvt/adapter-temporal
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts
  - apps/temporal-worker/src/ops/TemporalWorkerMonitor.ts
  - apps/temporal-worker/src/ops/OperationalServer.ts
  - apps/temporal-worker/src/plugins/env.ts
  - apps/temporal-worker/src/host/runTemporalWorkerHost.ts
  - packages/@dvt/adapter-temporal/src/RunStateCommandPortCircuitBreaker.ts
  - packages/@dvt/adapter-temporal/src/index.ts
  - packages/@dvt/adapter-temporal/scripts/run-postgres-integration.cjs
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
  - packages/@dvt/contracts/src/contracts/engine/RunExecutionContext.v1.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal test:integration:transformation:local
    - pnpm --filter @dvt/adapter-temporal test:integration:postgres:local
    - pnpm --filter @dvt/adapter-temporal test:integration:local
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm --filter dvt-temporal-worker test
    - pnpm verify:prepush
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs
---

## Summary

This slice hardens Temporal run-state command behavior and worker runtime operations while keeping cancellation and integration semantics deterministic.

## Delivered outcomes

1. Added a run-state command circuit breaker in `@dvt/adapter-temporal` and wired it through adapter exports.
2. Hardened Temporal worker runtime startup/monitoring/config behavior in `apps/temporal-worker` with test coverage.
3. Fixed Temporal integration-critical contract bundling compatibility by removing `node:url` dependency from workflow-bundled contract code.
4. Added script-level environment fallback for local Postgres integration runs to keep DB integration flow reproducible.
5. Corrected cancellation integration assertion to validate unique project bundle references per run.

## Residual risk posture

1. Circuit-breaker thresholds and retry tuning are still environment-sensitive and can drift without explicit production calibration.
2. Worker health/readiness endpoints are now covered in code and tests, but rollout environments must still verify operational baselines.
