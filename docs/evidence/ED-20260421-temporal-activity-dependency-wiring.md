---
title: Harden Temporal activity dependency wiring
status: Accepted
date: 2026-04-21
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/activities/activityTypes.ts
  - packages/@dvt/adapter-temporal/src/activities/activityFactory.ts
  - packages/@dvt/adapter-temporal/test/activities.test.ts
  - packages/@dvt/adapter-temporal/test/activityDeps.typecheck.ts
  - packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts
  - docs/risk-register/quality/R-20260421-TEMPORAL-ACTIVITY-DEPS-WIRING-DRIFT.yaml
evidence:
  tests:
    - pnpm exec eslint packages/@dvt/adapter-temporal/src/activities/activityTypes.ts packages/@dvt/adapter-temporal/src/activities/activityFactory.ts packages/@dvt/adapter-temporal/test/activities.test.ts packages/@dvt/adapter-temporal/test/activityDeps.typecheck.ts packages/@dvt/adapter-temporal/test/TemporalWorkerHost.lifecycle.test.ts --max-warnings 0
    - pnpm --filter @dvt/adapter-temporal typecheck:test
    - pnpm test:adapter-temporal
    - pnpm test:adapter-temporal:integration
    - pnpm docs:sync
    - pnpm docs:status:generate
    - cmd /c "set GIT_BASE=origin/main&& set GIT_HEAD=HEAD&& node tools/ci/arc-check.mjs"
    - pnpm verify:prepush
---

## Summary

This slice removes a contract drift inside `@dvt/adapter-temporal` activity
construction. `resolveExecutionSegment()` always depends on `fetcher` and
`integrity`, but `ActivityDeps` still described those seams as optional and
`createActivities()` only failed when that execution path was reached.

The fix hardens the boundary in two places:

1. `ActivityDeps` now requires `fetcher` and `integrity` at the type level.
2. `createActivities()` now validates the segment-resolution wiring eagerly.

## What this evidence closes

1. Temporal activity construction no longer accepts incomplete segment
   resolution wiring as a valid runtime dependency shape.
2. Unit tests now cover the fail-fast behavior instead of relying on a later
   runtime path to discover missing dependencies.
3. The worker lifecycle harness and idempotency mocks now match the active
   engine contract rather than older partial wiring assumptions.

## What remains open

1. The branch still operates under the governed drained-deploy cutover rule for
   workflow input changes; mixed-version replay compatibility remains out of
   scope for this slice.
2. Future composition roots must continue building `ActivityDeps` through
   canonical helpers or equivalent complete wiring to avoid reintroducing the
   same drift in parallel harnesses.
