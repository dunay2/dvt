---
title: Deterministic Temporal cancellation integration barrier
status: Accepted
date: 2026-08-09
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run ./test/integration.time-skipping.test.ts -t "signal\\(CANCEL\\) and cancelRun"
    - pnpm test:adapter-temporal:integration
    - pnpm --filter @dvt/adapter-temporal run typecheck
    - pnpm verify:prepush
---

## Summary

The combined Temporal cancellation integration scenario no longer relies on an
instantaneous DBT test activity remaining in flight after `StepStarted` is
persisted. Each run now owns an explicit activity barrier so the test controls
the cancellation boundary it asserts.

## Test semantics

- The `signal(CANCEL)` run releases its activity only after Temporal accepts the
  logical cancellation signal and must still end with provider status
  `COMPLETED`.
- The `cancelRun()` run remains blocked until provider-native cancellation
  aborts the activity and must end with provider status `CANCELLED`.
- Both runs must retain one ordered canonical lifecycle from
  `RunCancelRequested` to `RunCancelled` without `RunCompleted`.

No production adapter, workflow, contract, timeout, or retry behavior changed.
