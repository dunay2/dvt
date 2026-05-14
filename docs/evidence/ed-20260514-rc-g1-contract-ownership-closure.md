---
title: RC-G1 contract ownership closure
status: Accepted
date: 2026-05-14
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/engine/RunStateVocabulary.v1.ts
  - packages/@dvt/contracts/src/index.ts
  - packages/@dvt/contracts/index.js
  - packages/@dvt/contracts/test/provider-adapter.architecture.test.ts
  - packages/@dvt/contracts/test/run-state-store-maintenance-concurrency.architecture.test.ts
  - docs/contracts/shared/CompiledCodeRef.v1.schema.json
  - scripts/sync-docs.cjs
  - docs/planning/proposals/mandatory/runtime-and-contracts/contracts-domain-ownership-migration-plan-20260327.md
  - docs/risk-register/quality/R-20260402-RC-G1-CONTRACT-OWNERSHIP-EXECUTION-DRIFT.yaml
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- test/provider-adapter.architecture.test.ts
    - pnpm --filter @dvt/contracts test -- test/run-state-store-maintenance-concurrency.architecture.test.ts
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm governance:refresh
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# Summary

This ARC-2 evidence closes the `RC-G1` parent task after the `RC-G1-B/C/D`
owner-package migrations.

The slice removes the residual physical shared-kernel drift for engine-owned
behavior ports:

- `IProviderAdapter` is no longer physically hosted in `@dvt/contracts`.
- `IRunStateStore`, `RunStateCommandPort`, `IClock`, and
  `IIdempotencyKeyBuilder` are no longer physically hosted in `@dvt/contracts`.
- `IProjector` is no longer physically hosted in `@dvt/contracts`.
- shared event, snapshot, metadata, artifact-ref, and idempotency DTOs remain in
  `@dvt/contracts` through `RunStateVocabulary.v1.ts`.
- the tracked legacy `packages/@dvt/contracts/index.js` entrypoint delegates to
  the canonical source barrel instead of re-exporting deleted adapter files.

# Fowler / DDD Result

`@dvt/contracts` now acts as a shared kernel for published serializable
vocabulary. Engine behavior ports are owned by `@dvt/engine`, and the
architecture tests assert that distinction mechanically.

# Residual Risk

The original RC-G1 drift risk is marked mitigated in
`docs/risk-register/quality/R-20260402-RC-G1-CONTRACT-OWNERSHIP-EXECUTION-DRIFT.yaml`.
Future ownership drift should open a new task and must not extend the closed
`RC-G1` migration.
