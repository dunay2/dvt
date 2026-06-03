---
title: AR-D PlanRef DBT plugin package extraction
status: Accepted
date: 2026-05-14
owners:
  - packages/@dvt/adapter-temporal
  - packages/@dvt/temporal-dbt-plugin
  - apps/temporal-worker
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/index.ts
  - packages/@dvt/adapter-temporal/test/dbt-package-extraction.architecture.test.ts
  - packages/@dvt/temporal-dbt-plugin/src/index.ts
  - apps/temporal-worker/src/runtime/temporalWorkerDbtProfile.ts
  - apps/api/src/infrastructure/startRun/ArtifactStoreDbtProjectBundleBindingPolicy.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-package-extraction.architecture.test.ts
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/temporal-dbt-plugin test
    - pnpm --filter @dvt/temporal-dbt-plugin typecheck
    - pnpm --filter dvt-temporal-worker test
---

## Summary

This evidence records the `AR-D-PLAN-POINTER` package-level DBT extraction
slice. The Temporal adapter now publishes generic Temporal adapter and
step-plugin ports only. Concrete DBT plugin ownership moved to
`@dvt/temporal-dbt-plugin`, including the DBT manifest, step activity registry,
CLI runner, argument mapping, process execution, materialization, failure
mapping, and helper contracts.

The slice hardcuts DBT concrete exports from `@dvt/adapter-temporal` instead of
leaving compatibility re-exports. API admission and the Temporal worker DBT
profile now consume DBT semantics from the DBT plugin package.

## Validation Notes

The architecture guard was run red first and failed because the adapter root API
still exported DBT symbols, the new package did not exist, and API/worker
composition roots still imported DBT symbols from `@dvt/adapter-temporal`.
After the package extraction, the same guard passed.
