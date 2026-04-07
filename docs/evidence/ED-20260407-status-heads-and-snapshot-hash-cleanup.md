---
title: Status-head prewarm and runtime hash contract cleanup
status: Accepted
date: 2026-04-07
owners:
  - @dvt/adapter-postgres
  - @dvt/contracts
  - @dvt/engine
  - dvt-api
  - @dvt/web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts
  - packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts
  - packages/@dvt/contracts/src/types/contracts.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/engine/src/core/SnapshotProjector.ts
  - apps/api/src/application/services/getRunStatusUseCase.ts
  - apps/web/src/app/services/runs/runsService.api.ts
evidence:
  tests:
    - pnpm docs:sync
    - pnpm verify:prepush
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/engine exec vitest run test/contracts/engine.test.ts test/adapters/MockAdapter.cancel.test.ts
    - pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/integration/plannerEngineContract.test.ts
    - pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/services/runs/runsService.test.ts
---

# Summary

This slice completes two related changes:

1. Move active-run status serving toward a dedicated status-head strategy while
   keeping rich snapshots asynchronous.
2. Remove `RunStatusSnapshot.hash` from the runtime contract and from API/web
   status DTO usage so polling logic is not coupled to snapshot digesting.

# Scope

- Adapter Postgres runtime paths and tests for snapshot prewarm behavior.
- Shared contract and engine projection updates removing status hash emission.
- API and web runtime response mapping updates removing status hash dependency.
- ADR/proposal/closeout updates documenting the status-head rationale.

# Validation Notes

`pnpm verify:prepush` passed on the final branch state.

Package-scoped runs for `@dvt/web typecheck` and `dvt-api typecheck` remain
blocked by pre-existing workspace dependency resolution issues unrelated to this
slice:

- `@dvt/web typecheck`: unresolved `@xterm/*` and `@monaco-editor/react`.
- `dvt-api typecheck`: pretypecheck dependency build failure in
  `@dvt/plan-verifier` (`TS2307` for `@dvt/contracts`).
