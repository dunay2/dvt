---
title: Provider ref updates preserve explicit empty optional values
status: Accepted
date: 2026-04-09
owners:
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/state/InMemoryRunStateStore.ts
  - packages/@dvt/engine/src/state/InMemoryTxStore.ts
  - packages/@dvt/engine/src/services/startRun/StartRunEventFactory.ts
  - packages/@dvt/engine/test/state/providerRefPersistence.test.ts
  - packages/@dvt/engine/test/services/StartRunEventFactory.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test -- test/services/StartRunEventFactory.test.ts test/state/providerRefPersistence.test.ts
    - pnpm verify:prepush
---

## Summary

Provider ref updates in the in-memory state stores and `StartRunEventFactory`
treated optional provider fields as truthy values instead of explicit
`undefined` checks. That meant an intentional empty string was discarded even
when the caller had supplied it as the value to persist.

This slice aligns provider-ref update semantics with the repository's normal
`undefined`-means-absent model.

## What changed

- `InMemoryRunStateStore.saveProviderRef(...)` now preserves
  `providerNamespace`, `providerTaskQueue`, and `providerConductorUrl` whenever
  they are explicitly present, including `''`.
- `InMemoryTxStore.saveProviderRef(...)` now uses `!== undefined` for the same
  optional provider fields.
- `StartRunEventFactory.buildRunMetadata(...)` and
  `buildProviderRefUpdate(...)` now preserve an explicit empty
  `providerTaskQueue` instead of dropping it on truthy checks.
- Regression tests now cover both the producer seam and the in-memory store
  persistence seam.

## Expected effect

- Provider-ref persistence no longer rewrites explicit empty optional values
  into "missing" values.
- In-memory stores behave consistently with explicit update semantics based on
  presence vs absence.
- The start-run producer seam and the store seam now agree on when an optional
  provider field should be persisted.
