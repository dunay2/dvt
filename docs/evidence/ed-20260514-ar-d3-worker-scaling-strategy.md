---
title: AR-D3 worker scaling strategy closeout
status: Accepted
date: 2026-05-14
owners:
  - '@dvt/adapter-temporal'
arc_level: ARC-2
breaking: false
code_refs:
  - docs/planning/proposals/mandatory/runtime-and-contracts/ar-d3-worker-scaling-strategy-plan-20260514.md
  - packages/@dvt/adapter-temporal/vitest.config.ts
  - packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts
  - tools/ci/policy/workflow-scope.json
  - tools/ci/scope-config.mjs
  - docs/architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md
  - docs/runbooks/temporal-worker-scaling-operations.md
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts
    - pnpm test:ci-tools
    - pnpm docs:feature-mechanization -- --feature AR-D3-WORKER-SCALING-STRATEGY
    - pnpm docs:feature-mechanization:implementation
---

# AR-D3 Worker Scaling Strategy Closeout

## Evidence Summary

AR-D3 now closes as a documented Temporal worker scaling strategy rather than a
runtime rewrite:

- queue-local worker pools are the supported scaling unit;
- `toTemporalTaskQueue()` remains the tenant queue assignment authority;
- `TemporalWorkerHost` remains a single configured task-queue host;
- a global shared worker pool is explicitly not implemented;
- the operator runbook names capacity, cold-start, autoscaling, and production
  readiness evidence requirements.

## Validation

The architecture test
`packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts`
was introduced red against the previous docs, then passed after the strategy and
runbook were updated.

The merge validation also covered the adapter test harness after `main`
extracted `@dvt/temporal-dbt-plugin`: `packages/@dvt/adapter-temporal/vitest.config.ts`
keeps source-loaded DBT plugin tests bound to the adapter source public boundary
so package-local tests do not read stale compiled adapter exports.

The same rebase exposed a CI workspace-matrix coverage gap for the newly
extracted `@dvt/temporal-dbt-plugin` package on `main`; `tools/ci/scope-config.mjs`
and `tools/ci/policy/workflow-scope.json` now route that workspace through the
same build/typecheck/test coverage rails as the other workspaces.
