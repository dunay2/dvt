---
title: Effective plan-wide concurrency in Temporal
status: final
date: 2026-10-15
owners:
  - '@dvt/adapter-temporal'
  - '@dvt/contracts'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/adapter-temporal/src/workflows/workflowPlanConcurrency.ts
  - packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.stepExecution.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layers.ts
  - packages/@dvt/adapter-temporal/test/workflow-plan-concurrency.test.ts
  - packages/@dvt/adapter-temporal/test/runPlanWorkflow.concurrency.test.ts
  - packages/@dvt/adapter-temporal/test/runPlanWorkflow.concurrency.controls.test.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/planConcurrencyCases.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/planConcurrencyControlCases.ts
  - packages/@dvt/contracts/src/contracts/planner/PolicyMappingTable.v1.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal test --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter @dvt/adapter-temporal prepare:integration
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/integration.time-skipping.test.ts test/integration.transformation.time-skipping.test.ts --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/contracts test --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/planner test --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/planner typecheck
    - pnpm --filter @dvt/plan-interpreter test --maxWorkers=1 --no-file-parallelism
    - pnpm exec eslint packages/@dvt/adapter-temporal/src packages/@dvt/adapter-temporal/test packages/@dvt/contracts/src --max-warnings 0
    - pnpm lint:determinism
    - node tools/ci/check-determinism.mjs
    - pnpm arch:deps
    - pnpm traceability:adr0
    - pnpm validate:contracts
    - pnpm golden:validate
    - node scripts/compare-hashes.cjs
---

# Effective Plan-Wide Concurrency In Temporal

## Authority And Change

[#2819](https://github.com/dunay2/dvt/issues/2819) owns this slice. Its
[preimplementation admission](https://github.com/dunay2/dvt/issues/2819#issuecomment-6198119194)
records current/solution diagrams, Fowler analysis, allowed surfaces and negative
tests. Planning DB design and mechanization `GH-2819-PLAN-CONCURRENCY` reuse the
existing StartRun rail; no new command or scheduler is introduced.

Governing sources are AGENTS.md, command/query rail governance, Fowler governance,
ADR-0001/0003/0007/0040/0046/0047/0052, ExecutionSemantics.v1, the planner policy
vocabulary and common step configuration schema, and the
[Temporal component guide](../architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md).

The planner already materialized K in `stepTypeConfig.concurrency`; Temporal
discarded it and launched the entire layer. The resolver now validates all steps
against the existing shared schema and rejects mixed limits or mixed absence.
The bounded segment carries the one effective limit. No second default or cursor
copy is introduced. The existing layer executor admits work as slots become free,
publishes StepStarted only at admission and preserves result order by plan index.
The old emit-all-starts helper is removed rather than retained as a parallel path.

The normative mapping table now distinguishes semantic per-plan admission from
worker capacity hints. Planner defaults and wire configuration remain unchanged.
Ordinary failures preserve same-layer siblings; signals, native cancellation,
publication failure, gateway/skip, pause and continuation retain explicit limits
documented in the component guide.

## RED And GREEN

- Initial activity-boundary unit RED observed three simultaneous activities for
  both K=1 and K=2. The original unbounded implementation ignored the limit.
- A fixture initially abbreviated `stepTypeConfig` as `config`; typechecking
  caught it. After correcting that fixture, removing only the new projection
  enforcement reproduced 15 failures and two passes. Restoring it passes all
  17 full-plan coherence cases, including cross-layer inconsistency.
- All 28 focused policy/admission/control unit cases pass. Focused V8 coverage
  is 100% statements/branches/functions for the new pure policy resolver. The
  full step-execution file is 86.92% statements and 64.44% branches in that
  focused run; it includes pre-existing error and gateway logic, additionally
  exercised by the package and integration suites. No coverage rule was lowered.
- Complete adapter unit suite: 283 tests in 33 files pass. Production and test
  typechecking pass; tests remain split by policy, admission and control concern.
- Contracts: 820 tests in 74 files and typechecking pass. Planner: 86 tests in
  15 files and typechecking pass. Plan interpreter: 23 tests pass.
- Scoped ESLint, both determinism checks, architecture dependencies and ADR-0000
  traceability pass. Initial lint warnings were fixed, not waived.
- Canonical integration preparation passes. Windows time-skipping plus
  transformation suites pass all 28 tests without skipped cases. Eleven new
  service-backed cases cover bounded/unbounded admission, refill, retry,
  continuation, native/cooperative cancellation, publication failure, ordinary
  failure, gateway/skip and pause. Each new case replays its actual history;
  continuation replays both executions and does not re-execute activities.
- Initial replay attempts used DVT's logical runId as a Temporal execution id.
  The fixture now captures the provider execution id from describe() before any
  continuation. Those initial NOT_FOUND failures were test errors, not product
  defects or passing evidence.
- Contract fixtures pass 25 checks; the pre-existing missing glossary is reported
  by that tool. Golden hashes match all three implemented fixtures and preserve
  two deprecated baselines; the existing unimplemented retry fixture is skipped.
  Both workflow-routed JSON schemas compile with their actual draft2020 settings;
  the existing unknown URI-format warning remains. An initial wrong path/draft
  invocation was corrected; it is not counted as successful validation.

### Measured Activity Boundary

| Policy                | Independent first-layer jobs | Maximum active activities | Evidence                                                  |
| --------------------- | ---------------------------- | ------------------------- | --------------------------------------------------------- |
| K=1                   | 3                            | 1                         | Controlled real Temporal activities; queued starts absent |
| K=2                   | 3                            | 2                         | Free slot refills while a slower sibling remains active   |
| Unbounded             | 3                            | 3                         | No runtime default silently reintroduced                  |
| K=2 with continuation | 3 then 3                     | 2                         | Both histories replay; six jobs execute once              |

These are capacity invariants, not throughput or latency benchmarks. The service
is real Temporal; the canonical event store and DBT activity runner are existing
test adapters. No PostgreSQL publication or dbt-internal DAG concurrency is
claimed. DVT steps represent independent operational jobs, not Canvas cards or
relational operators invented to obtain parallelism.

## Integration And Rollout Boundary

The full-diff evaluator selects ARC-2: evidence/risk and
lint/test/schema-validate/contract-golden are required. Hook-normalized prepush,
complete Linux integration including retained identity, exact-SHA mechanization
and review/CI results are recorded on the implementation PR and issue; this
record does not infer them from earlier green runs.

The user approved a development hard cut without old-history replay support and
confirmed that existing execution data is test data. This slice needs no deletion
or reset. Activation still follows the
[drained cutover runbook](../runbooks/temporal-planref-drained-cutover-20260427.md).
No worker restart, deployment or shared-data cleanup occurs during validation.

No new debt, stub, placeholder, dependency, rule relaxation or bypassed hook is
introduced. Native plural PostgreSQL workloads, Sink behavior and full T11
end-to-end acceptance remain on #2524/#3207/#2599. The separate
[rollout risk](../risk-register/temporal-plan-concurrency-20261015.md) remains open
until activation evidence exists.
