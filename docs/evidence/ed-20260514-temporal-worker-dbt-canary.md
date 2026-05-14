---
title: Temporal worker DBT Docker canary
status: Accepted
date: 2026-05-14
owners:
  - dvt-temporal-worker
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - apps/temporal-worker/test/host/runTemporalWorkerHost.test.ts
  - apps/temporal-worker/package.json
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
evidence:
  tests:
    - pnpm proof:temporal:postgres:reset
    - DVT_PG_INTEGRATION=1 pnpm --filter dvt-temporal-worker test -- test/host/runTemporalWorkerHost.test.ts
    - pnpm --filter dvt-temporal-worker test
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm verify:prepush
---

# Temporal worker DBT Docker canary

This evidence records the TF-C3-E canary closure for the DBT-enabled Temporal
worker. The canary starts the real worker host against a Docker-backed Postgres
proof environment, a Temporal test environment, real plan-store artifacts, run
metadata, readiness endpoints, metrics, and DBT invocation evidence.

The engine change is limited to removing an unused constructor parameter
property from `StartRunApplicationService`; it does not change start-run
behavior or public API.
