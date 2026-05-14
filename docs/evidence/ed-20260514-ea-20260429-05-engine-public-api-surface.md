---
title: Engine public API surface split
status: Accepted
date: 2026-05-14
owners:
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
  - apps/api
  - apps/temporal-worker
  - apps/outbox-worker
  - packages/@dvt/delivery
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/engine/src/index.ts
  - packages/@dvt/engine/src/runtime.ts
  - packages/@dvt/engine/src/testing.ts
  - packages/@dvt/engine/src/contracts/runEvents.ts
  - packages/@dvt/engine/src/state/runEventWritePolicy.ts
  - packages/@dvt/engine/test/architecture/enginePublicApiSurface.architecture.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/architecture/enginePublicApiSurface.architecture.test.ts
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter @dvt/state-store typecheck
    - pnpm --filter dvt-outbox-worker typecheck
    - pnpm --filter @dvt/delivery typecheck
---

# Engine Public API Surface Split

## Scope

This evidence record covers `EA-20260429-05`, which splits the engine package
surface into stable public, runtime composition, and testing entrypoints.

## Proof Summary

- `@dvt/engine` now owns the stable published interface.
- `@dvt/engine/runtime` owns runtime builders, policies, services, and workers.
- `@dvt/engine/testing` owns in-memory stores and provider test doubles.
- Engine event vocabulary uses canonical `@dvt/contracts` names directly and
  no longer keeps engine-local compatibility aliases.
- A semantic architecture test validates package exports, docs, owned-concern
  headers, forbidden root/runtime/test leakage, and legacy event alias removal.
