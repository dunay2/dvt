---
title: Typed parameters for Code model compilation and materialization
status: draft
date: 2026-11-18
owners:
  - API
  - Web
  - Temporal
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/infrastructure/dbt/dbtManifestResourceProjection.ts
  - apps/web/src/app/views/code/CodeModelCommands.tsx
  - packages/@dvt/temporal-dbt-plugin/src/dbtCliArguments.ts
  - packages/@dvt/temporal-dbt-plugin/src/dbtRunResult.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/run-parameters.contract.test.ts
    - pnpm --filter @dvt/web test:e2e:native --spec cypress/e2e/canvas/code-workbench-model-commands.cy.ts
    - pnpm --filter @dvt/temporal-dbt-plugin exec vitest run test/DbtCliPluginRunner.test.ts
    - pnpm --filter @dvt/temporal-dbt-plugin exec vitest run test/dbtCliResult.test.ts
---

# Code model parameter acceptance

The [design and runnable example](../adr/ADR-0071-typed-parameters-for-model-execution.md)
identify the executable source, variables and expected rows. Preview admission
and StartRun must agree on the scoped plan and exact dbt input across compile,
materialization and retry. Execution of a model with no declared parameters
omits `--vars` and still verifies the selected resource.

dbt Core 1.11.11 parsed the SQL model from ADR-0071 without supplying variables.
Its manifest exposed the `minimum_amount` declaration and its disabled-by-default
flag. In a disposable PostgreSQL database, `dbt compile` and `dbt run` with
`use_minimum=false` materialized 10, 20 and 30. Repeating both commands with
`use_minimum=true` and `minimum_amount=20` materialized 20 and 30. Each run
was verified by querying the materialized table. The database lease was released.

The typed contract test initially failed four of five cases because the
resolver and variables schema were absent. All five passed after implementation.
The package build and all 1,052 contract cases in 83 files subsequently passed.
The two API suites for the scoped graph read and manifest projection passed
23 cases. The command and browser tests check application admission separately
from the provider example.

The API cohort passed 86 cases in ten files. Before the fix the compiler cache
reused missing variable arguments, Run accepted replacement parameters into
the use case, and native compilation could change the admitted parents or
materialization. The real Planner retained the same plan ID for default and
explicit zero and distinguished a disabled flag, a different value, and a
different environment. After another compilation with value seven, a retry of
the earlier plan still received zero. A forged receipt was rejected before
storage or dispatch. Four Web dialog cases failed before the parameter UI
existed and passed after implementation.

The [risk entry](../risk-register/code-model-run-parameters-20261118.md)
identifies the cross-scope, stale-value and unintended-write cases. Record
the protected API, worker and UI results as well as the exact candidate in
[#3120](https://github.com/dunay2/dvt/issues/3120). A standalone native dbt
example verifies provider behavior independently of those application checks.

The worker process regression first reproduced six false completions after a
zero exit. The process tests use the current invocation's `run_results.json`
as evidence. They cover a missing artifact despite a prior
result, an empty selection, a different model, an extra model, a skipped
resource, malformed entries, and the selected model alongside a project hook.
An older plan without a manifest identity requires fresh successful resource
results as well.

The protected DVT flow imported the same example through Workspace Files,
read its declared parameter from the native manifest, and accepted two distinct
plan references. An undeclared override failed admission. Each confirmation
started one run with one completed model step. After each `RunCompleted`, the
proof looked up the materialized table in PostgreSQL and queried its rows. The
first run produced 10, 20 and 30, and the second produced 20 and 30. The worker
drained before the disposable database and dbt artifacts were released.
