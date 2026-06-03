---
title: DBT CLI plugin runner SRP hardening
status: Accepted
date: 2026-04-29
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/plugins/TemporalStepPluginRunner.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/DbtCliPluginRunner.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/dbtCliArguments.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/dbtCliFailures.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/dbtCliProcess.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/dbtCliProjectMaterializer.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/dbtCliTypes.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/dbtPluginTypes.ts
  - packages/@dvt/adapter-temporal/test/dbt-core-decoupling.architecture.test.ts
  - packages/@dvt/adapter-temporal/test/DbtCliPluginRunner.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/dbt-core-decoupling.architecture.test.ts test/DbtCliPluginRunner.test.ts
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm lint
    - pnpm docs:status:generate
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

# DBT CLI Plugin Runner SRP Hardening

## Summary

`DbtCliPluginRunner.ts` previously owned DBT runner orchestration, subprocess
execution, bundle materialization, archive extraction, project discovery,
argument derivation, cleanup, and failure classification in one module.

This slice keeps the public runner behavior and DBT worker profile intact, but
splits the DBT CLI runtime into focused plugin-local modules and introduces a
generic `TemporalStepPluginRunner<TExecutionInput>` port that DBT implements as
`DbtPluginRunner`.

## Boundary Statement

No new executor plugin was added. SQL and other future executors remain future
features. The change only hardens the existing DBT plugin boundary so future
plugins can implement the same runner port without modifying Temporal core
dispatch.

## Evidence Summary

- `DbtCliPluginRunner` now coordinates helper ports instead of importing
  `child_process`, `fs/promises`, or `tar` directly.
- DBT CLI command arguments, subprocess execution, project materialization,
  failure mapping, and helper contracts are grouped under `src/plugins/dbt`.
- Architecture tests fail if the runner becomes a multi-responsibility module
  again or if DBT stops implementing the generic runner port.
- The existing runner tests still validate DBT command mapping, target profile
  behavior, failure mapping, cleanup, and availability probe behavior.

## No-Debt Statement

This evidence records no approved debt, no relaxed rule, and no stubbed plugin
implementation.
