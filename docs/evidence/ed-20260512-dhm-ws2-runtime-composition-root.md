---
title: DHM-WS2 runtime composition root
status: Accepted
date: 2026-05-12
owners:
  - dvt-api
arc_level: ARC-1
breaking: false
code_refs:
  - apps/api/src/runtime/intentReconcilerRuntime.ts
  - apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
evidence:
  tests:
    - pnpm docs:feature-mechanization -- --feature DHM-WS2-RUNTIME-COMPOSITION-ROOT
    - pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts
    - pnpm --filter dvt-api test -- test/server.test.ts
    - pnpm --filter dvt-api typecheck
---

# DHM-WS2 Runtime Composition Root

## Summary

`DHM-WS2` extracts the intent reconciler runtime startup sequence into
`IntentReconcilerRuntimeComposition` while preserving the existing exported
`createIntentReconcilerRuntime` factory.

The API runtime remains the composition root for configuration resolution,
Postgres store creation, migration, provider adapter resolution, maintenance
service creation, worker creation, and runtime handle publication.

## Validation Evidence

- `pnpm docs:feature-mechanization -- --feature DHM-WS2-RUNTIME-COMPOSITION-ROOT`
  - Passed with the DHM-WS2 feature block present.
- `pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts`
  - RED first: failed before the composition object existed.
  - GREEN after implementation: passed, 3 tests.
- `pnpm --filter dvt-api test -- test/server.test.ts`
  - Passed, 18 tests.
- `pnpm --filter dvt-api typecheck`
  - Passed.

## No-Debt Evidence

No public API behavior, engine package surface, provider adapter contract, or
runtime health contract changed. The architecture guard fails if the exported
factory regains direct startup assembly or if startup ordering becomes implicit.
