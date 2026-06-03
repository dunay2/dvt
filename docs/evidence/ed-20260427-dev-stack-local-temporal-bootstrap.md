---
title: Dev stack local Temporal bootstrap
status: Accepted
date: 2026-04-27
owners:
  - '@dvt/adapter-temporal'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts
  - scripts/run-dev-stack.cjs
  - scripts/run-dev-stack.temporal.cjs
evidence:
  tests:
    - node --test scripts/run-dev-stack.test.cjs
    - pnpm --filter @dvt/adapter-temporal test -- TemporalWorkerHost.lifecycle.test.ts
    - pnpm --filter @dvt/adapter-temporal build
    - $env:DVT_TEMPORAL_ADMIN_PORT='9470'; node scripts/run-dev-stack.cjs --test-only --api-port 3001 --web-port 5174 --ready-timeout-ms 240000
---

# Dev Stack Local Temporal Bootstrap

## Summary

The coordinated local dev stack now starts a local Temporal dev service when it
creates the local protected runtime and the caller has not supplied
`TEMPORAL_ADDRESS`.

The change keeps the protected Canvas authoring path backed by the real API,
Postgres, OIDC grant, Temporal worker, and Temporal SDK runtime. It does not
fall back to mock Canvas authoring or hide an explicitly configured external
Temporal runtime.

## Evidence

- `run-dev-stack` decision tests prove local Temporal is bootstrapped only for
  the missing local protected-runtime dependency.
- `run-dev-stack` Temporal tests prove the helper uses the full local Temporal
  dev server path instead of the time-skipping test server path.
- `TemporalWorkerHost` lifecycle tests prove the default workflow path resolves
  under ESM and that optional worker identity is omitted when unset.
- Full `run-dev-stack --test-only` proof showed the worker running, protected
  API routes registered, `/readyz` passing, and the web app ready.
